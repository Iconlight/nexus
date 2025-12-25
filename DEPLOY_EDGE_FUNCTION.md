# Quick Deployment Commands

## Deploy Updated Edge Function

```powershell
cd "c:\Users\Administrator\Documents\Ariel's workspace\nexus"
npx supabase functions deploy invite-employee
```

## Check Logs After Deployment

```powershell
npx supabase functions logs invite-employee --limit 50
```

## Test Email Sending

After deployment, invite a test employee and check:
1. Supabase Edge Function logs for email sending status
2. EmailJS dashboard for sent emails
3. Employee email inbox

## Expected Log Output

If working correctly, you should see:
```
Email sent successfully: OK
```

If failing, you'll see:
```
EmailJS Error Response: [error message]
EmailJS Status: [status code]
```

## Common Issues

1. **Template not found**: Create template with ID `template_employee_invite` in EmailJS
2. **Invalid credentials**: Verify public key and private key in .env
3. **Service ID mismatch**: Ensure service ID is `service_89mlz15`
