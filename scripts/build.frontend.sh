set -e  # exit on error

cd frontend
npm install
npm run build
cd -

rm -rf /__/tmp/scruto-webapp
cp -r frontend/build /__/tmp/scruto-webapp
chmod -R 777 /__/tmp/scruto-webapp

rm -rf server/app
cp -r frontend/build server/app