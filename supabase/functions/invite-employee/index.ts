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
            role = 'employee'
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
                is_active: true
            })

        if (profileInsertError) {
            // Rollback: delete user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            throw new Error(`Failed to create profile: ${profileInsertError.message}`)
        }

        // TODO: Send invitation email with temporary password
        // For now, we'll just return the temp password (in production, send via email)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Employee invited successfully',
                userId: authData.user.id,
                tempPassword: tempPassword, // Remove this in production
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
