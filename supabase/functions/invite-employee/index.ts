// Supabase Edge Function: invite-employee
// Deploy this to: supabase/functions/invite-employee/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Get the authenticated user (admin)
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get admin's profile to get company_id
        const { data: adminProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('company_id, role')
            .eq('id', user.id)
            .single()

        if (profileError || !adminProfile) {
            return new Response(
                JSON.stringify({ error: 'Admin profile not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user is admin
        if (adminProfile.role !== 'admin' && adminProfile.role !== 'ceo') {
            return new Response(
                JSON.stringify({ error: 'Only admins can invite employees' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            role = 'employee',
            jobTitle,
            workingDays = 5,
            workingHours = 8,
            allowedLeaveDays = 21,
            baseSalary,
            teamId,
            gender
        } = await req.json()

        // Validate input
        if (!firstName || !lastName || !email) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Generate a temporary password
        const tempPassword = crypto.randomUUID()

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
            }
        })

        if (authError) {
            throw new Error(`Failed to create user: ${authError.message}`)
        }

        // Create profile
        const { error: profileInsertError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                company_id: adminProfile.company_id,
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                role,
                job_title: jobTitle,
                working_days_per_week: workingDays,
                working_hours_per_day: workingHours,
                allowed_leave_days: allowedLeaveDays,
                is_active: true,
                team_id: teamId || null,
                gender: gender || null,
                base_salary: baseSalary || null
            })

        if (profileInsertError) {
            // Rollback: delete user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            throw new Error(`Failed to create profile: ${profileInsertError.message}`)
        }

        // Create initial payroll record if base salary provided
        if (baseSalary) {
            const currentDate = new Date()
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

            const { error: payrollError } = await supabaseAdmin
                .from('payroll_records')
                .insert({
                    company_id: adminProfile.company_id,
                    employee_id: authData.user.id,
                    month: firstDayOfMonth.toISOString().split('T')[0],
                    base_salary: baseSalary,
                    bonuses: 0,
                    deductions: 0,
                    net_salary: baseSalary,
                    status: 'draft'
                })

            if (payrollError) {
                console.error('Failed to create payroll:', payrollError)
                // Don't fail the whole operation, just log the error
            }
        }

        // Send invitation email via EmailJS
        try {
            const emailJSServiceId = Deno.env.get('EMAILJS_SERVICE_ID') || 'service_89mlz15'
            const emailJSPublicKey = '-498bHu_Q6ygG_PkWm'
            const emailJSPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY') || 'mpyoyRmPLIKMjh4d43ijU'

            console.log('EmailJS Config:', {
                serviceId: emailJSServiceId,
                publicKey: emailJSPublicKey.substring(0, 5) + '...',
                hasPrivateKey: !!emailJSPrivateKey
            })

            // Get company name
            const { data: company } = await supabaseAdmin
                .from('companies')
                .select('name')
                .eq('id', adminProfile.company_id)
                .single()

            const emailParams = {
                to_email: email,
                to_name: `${firstName} ${lastName}`,
                company_name: company?.name || 'Your Company',
                username: `${firstName} ${lastName}`,
                temp_password: tempPassword,
                job_title: jobTitle || 'Not specified',
                working_days: workingDays,
                working_hours: workingHours,
                leave_days: allowedLeaveDays,
                login_url: Deno.env.get('APP_URL') || 'https://your-app-url.com'
            }

            // EmailJS REST API v1.0 format
            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: emailJSServiceId,
                    template_id: 'template_employee_invite',
                    user_id: emailJSPublicKey,
                    accessToken: emailJSPrivateKey,
                    template_params: emailParams
                })
            })

            const emailResult = await emailResponse.text()

            if (!emailResponse.ok) {
                console.error('EmailJS Error Response:', emailResult)
                console.error('EmailJS Status:', emailResponse.status)
            } else {
                console.log('Email sent successfully:', emailResult)
            }
        } catch (emailError) {
            console.error('Email sending error:', emailError)
            // Don't fail the whole operation if email fails
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Employee invited successfully. Invitation email sent.',
                userId: authData.user.id,
                // Don't return temp password - it's sent via email
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
