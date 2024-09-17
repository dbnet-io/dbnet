set -e

# Build Frontend Bundle
cd frontend/dbnet-parser
yarn && yarn build
cd -

cd frontend
yarn && yarn build
cd -

rm -rf server/app
cp -r frontend/build server/app

# Build Backend Binary
rm -f dbnet
go mod tidy
go build --tags fts5 -o dbnet