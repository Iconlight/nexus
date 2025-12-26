-- Function to calculate monthly stats for an employee
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_monthly_employee_stats(
  p_employee_id UUID,
  p_month INT,
  p_year INT
)
RETURNS JSON AS $$
DECLARE
  v_working_days_per_week INT;
  v_allowed_leave_days INT;
  v_total_days_in_month INT;
  v_expected_working_days INT;
  v_present_days INT;
  v_leave_days INT;
  v_absent_days INT;
  v_attendance_rate NUMERIC;
  v_base_salary NUMERIC;
BEGIN
  -- Get employee details
  SELECT 
    working_days_per_week, 
    base_salary,
    allowed_leave_days
  INTO 
    v_working_days_per_week, 
    v_base_salary,
    v_allowed_leave_days
  FROM profiles 
  WHERE id = p_employee_id;

  -- Default working days if null
  v_working_days_per_week := COALESCE(v_working_days_per_week, 5);

  -- Calculate days in month
  -- Logic: Get date for 1st of Next Month, subtract 1 day, get day number
  v_total_days_in_month := DATE_PART('days', (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day'));

  -- Calculate expected working days
  -- Formula: (Total Days / 7) * Working Days Per Week
  -- This provides a consistent statistical expectation based on their contract
  v_expected_working_days := ROUND((v_total_days_in_month::NUMERIC / 7.0) * v_working_days_per_week::NUMERIC);

  -- Count Days Present (Unique check-in dates)
  SELECT COUNT(DISTINCT check_in_time::DATE) INTO v_present_days
  FROM attendance_logs
  WHERE employee_id = p_employee_id
  AND EXTRACT(MONTH FROM check_in_time) = p_month
  AND EXTRACT(YEAR FROM check_in_time) = p_year;

  -- Count Leaves Used (Approved status)
  SELECT COALESCE(SUM(duration), 0) INTO v_leave_days
  FROM leave_requests
  WHERE employee_id = p_employee_id
  AND status = 'approved'
  AND EXTRACT(MONTH FROM start_date) = p_month
  AND EXTRACT(YEAR FROM start_date) = p_year;

  -- Calculate Absent
  -- Absent = Expected - Present - Leave
  -- Floor at 0 to avoid negative numbers if they worked extra days
  v_absent_days := GREATEST(0, v_expected_working_days - v_present_days - v_leave_days);

  -- Calculate Attendance Rate
  -- (Present / (Expected - Leave)) * 100
  -- If they took leave, it shouldn't count against their rate.
  -- So denominator is (Expected - Leave). If that's 0 (e.g. whole month leave), rate is 100%.
  
  IF (v_expected_working_days - v_leave_days) > 0 THEN
    v_attendance_rate := ROUND((v_present_days::NUMERIC / (v_expected_working_days - v_leave_days)::NUMERIC) * 100, 1);
    -- Cap at 100%
    IF v_attendance_rate > 100 THEN v_attendance_rate := 100; END IF;
  ELSE
    v_attendance_rate := 100; -- No working days expected
  END IF;

  RETURN json_build_object(
    'daysPresent', v_present_days,
    'daysAbsent', v_absent_days,
    'leavesUsed', v_leave_days,
    'leavesAllowed', v_allowed_leave_days,
    'attendanceRate', v_attendance_rate,
    'baseSalary', v_base_salary
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
