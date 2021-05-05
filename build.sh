
# Build Frontend Bundle
cd frontend && npm install && npm run build || exit
mv build ../backend/

cd ../backend 
rm -rf static
mv build static

# Build Backend Binary
env GOOS=darwin GOARCH=amd64 packr build -o backend-mac || exit
env GOOS=windows GOARCH=386 packr build -o backend-win.exe || exit
env GOOS=linux GOARCH=amd64 packr build -o backend-linux || exit

mkdir -p ../release/backend
mv -f backend-* ../release/backend

# Build Electron App
cd ../frontend
npm run electron:build || exit

mkdir -p ../release/app
mv -f dist_electron/*.zip ../release/app

cd ..