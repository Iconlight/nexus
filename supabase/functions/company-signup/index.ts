// Supabase Edge Function: company-signup
// Deploy this to: supabase/functions/company-signup/index.ts

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
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service role key for admin operations
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const {
            companyName,
            adminEmail,
            adminPassword,
            adminFirstName,
            adminLastName,
            adminPhone
        } = await req.json()

        // Validate input
        if (!companyName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Step 1: Create company
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({
                name: companyName,
                subscription_status: 'active'
            })
            .select()
            .single()

        if (companyError) {
            throw new Error(`Failed to create company: ${companyError.message}`)
        }

        // Step 2: Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                first_name: adminFirstName,
                last_name: adminLastName,
            }
        })

        if (authError) {
            // Rollback: delete company
            await supabaseAdmin.from('companies').delete().eq('id', company.id)
            throw new Error(`Failed to create admin user: ${authError.message}`)
        }

        // Step 3: Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                company_id: company.id,
                first_name: adminFirstName,
                last_name: adminLastName,
                email: adminEmail,
                phone: adminPhone,
                role: 'admin',
                is_active: true
            })

        if (profileError) {
            // Rollback: delete user and company
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
            await supabaseAdmin.from('companies').delete().eq('id', company.id)
            throw new Error(`Failed to create profile: ${profileError.message}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Company and admin account created successfully',
                companyId: company.id,
                userId: authData.user.id
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
