@echo off
cd /d "C:\Users\MaximilianoGregorio\Claude\Projects\Conect App"

echo ============================================
echo  DEPLOY v1.3.0 - Conect App
echo  Google Login + Email verify + SMS verify
echo ============================================
echo.

echo [1/7] Eliminando git locks...
if exist ".git\index.lock"  del /f ".git\index.lock"  && echo (web index.lock eliminado)  || echo (sin web index.lock)
if exist ".git\HEAD.lock"   del /f ".git\HEAD.lock"   && echo (web HEAD.lock eliminado)    || echo (sin web HEAD.lock)
echo.

echo [2/7] Commiteando backend (auth v2)...
git rebase --abort 2>nul || echo (sin rebase activo)
git add prisma\schema.prisma
git add src\app\api\auth\mobile\google\route.ts
git add src\app\api\auth\verify-email\route.ts
git add src\app\api\auth\send-sms\route.ts
git add src\app\api\auth\verify-sms\route.ts
git add src\app\api\auth\register\route.ts
git add src\lib\email.ts
git add src\lib\requireAuth.ts
git add src\app\email-verificado\page.tsx
git add docs\privacy-policy.html
git diff --cached --quiet && echo (nada nuevo en backend) || git commit -m "feat: auth v2 - Google Login, verificacion email, verificacion SMS + anti-spam (Ley 25.326)"
echo.

echo [2b/7] Prisma db push (agrega phoneVerified, smsCode, emailVerifyToken a users)...
call npm run db:push
echo.

echo [3/7] Commiteando mobile v1.3.0...
cd mobile
if exist ".git\index.lock" del /f ".git\index.lock" && echo (mobile index.lock eliminado) || echo (sin mobile index.lock)
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"  && echo (mobile HEAD.lock eliminado)  || echo (sin mobile HEAD.lock)
git add app\(auth)\login.tsx
git add app\(auth)\register.tsx
git add app\(tabs)\profile.tsx
git add app\verify-email.tsx
git add app\verify-phone.tsx
git add lib\api.ts
git add store\auth.ts
git add package.json package-lock.json
git diff --cached --quiet && echo (nada nuevo en mobile) || git commit -m "feat: Google Login + verificacion email/SMS + pantallas verify (mobile v1.3.0)"
cd ..
echo.

echo [4/7] Push web a GitHub...
git add mobile
git commit -m "chore: bump mobile submodule a v1.3.0" 2>nul || echo (submodulo sin cambios)
git push origin main
echo.

echo [5/7] EAS Build android produccion...
cd mobile
call npx eas build --platform android --profile production --non-interactive
echo.

echo [6/7] Submit a Play Store (internal track)...
call npx eas submit --platform android --latest --non-interactive
echo.

echo ===== TODO LISTO =====
echo.
echo IMPORTANTE - Variables de entorno a agregar en Railway:
echo   GOOGLE_CLIENT_ID       = (web client ID de Google Cloud Console)
echo   GOOGLE_CLIENT_SECRET   = (secret de Google Cloud Console)
echo   GOOGLE_ANDROID_CLIENT_ID = (Android client ID - opcional)
echo   TWILIO_ACCOUNT_SID     = (de console.twilio.com)
echo   TWILIO_AUTH_TOKEN      = (de console.twilio.com)
echo   TWILIO_PHONE_NUMBER    = (numero Twilio con +1...)
echo.
echo IMPORTANTE - Variables de entorno a agregar en EAS (eas.json o Expo dashboard):
echo   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      = (mismo GOOGLE_CLIENT_ID)
echo   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  = (Android client ID)
echo.
cd ..
pause
