set -e  # exit on error

# Build Frontend Bundle
cd frontend
yarn
yarn build
cd -

rm -rf server/app
cp -r frontend/build server/app