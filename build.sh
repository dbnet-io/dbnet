set -e

# Build Frontend Bundle
cd frontend
yarn build
cd -

rm -rf server/app
cp -r frontend/build server/app

# Build Backend Binary
rm -f dbnet
go build -o dbnet