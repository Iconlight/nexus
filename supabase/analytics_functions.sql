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
  v_month_start DATE;
  v_month_end DATE;
  v_start_date DATE;
  v_effective_start DATE;
  v_effective_days INT;
BEGIN
  -- Get employee details
  SELECT 
    working_days_per_week, 
    base_salary,
    allowed_leave_days,
    created_at::DATE
  INTO 
    v_working_days_per_week, 
    v_base_salary,
    v_allowed_leave_days,
    v_start_date
  FROM profiles 
  WHERE id = p_employee_id;

  -- Default working days if null
  v_working_days_per_week := COALESCE(v_working_days_per_week, 5);

  -- Calculate month start and end
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::DATE;

  -- Determine effective start date (max of month start or employee start)
  v_effective_start := GREATEST(v_month_start, v_start_date);

  -- Calculate expected working days
  IF v_effective_start > v_month_end THEN
    v_expected_working_days := 0;
  ELSE
    v_effective_days := (v_month_end - v_effective_start + 1);
    -- Formula: (Effective Days / 7) * Working Days Per Week
    v_expected_working_days := ROUND((v_effective_days::NUMERIC / 7.0) * v_working_days_per_week::NUMERIC);
  END IF;

  -- Count Days Present (Unique check-in dates)
  SELECT COUNT(DISTINCT check_in_time::DATE) INTO v_present_days
  FROM attendance_logs
  WHERE employee_id = p_employee_id
  AND check_in_time::DATE >= v_month_start
  AND check_in_time::DATE <= v_month_end;

  -- Count Leaves Used (Approved status, calculate overlap days)
  -- Logic: Intersect [start_date, end_date] with [month_start, month_end]
  SELECT COALESCE(SUM(
    GREATEST(0, (LEAST(end_date, v_month_end) - GREATEST(start_date, v_month_start) + 1))
  ), 0) INTO v_leave_days
  FROM leave_requests
  WHERE employee_id = p_employee_id
  AND status = 'approved'
  AND start_date <= v_month_end
  AND end_date >= v_month_start;

  -- Calculate Absent
  v_absent_days := GREATEST(0, v_expected_working_days - v_present_days - v_leave_days);

  -- Calculate Attendance Rate
  IF (v_expected_working_days - v_leave_days) > 0 THEN
    v_attendance_rate := ROUND((v_present_days::NUMERIC / (v_expected_working_days - v_leave_days)::NUMERIC) * 100, 1);
    IF v_attendance_rate > 100 THEN v_attendance_rate := 100; END IF;
  ELSE
    v_attendance_rate := 100;
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
