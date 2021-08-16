set -e  # exit on error

# build frontend
cd frontend
yarn build
cd -

# copy dist
rm -rf server/app
cp -r frontend/build server/app

# back backend 
go build -o dbnet-x86_64-apple-darwin
/bin/cp -f dbnet-x86_64-apple-darwin frontend/resources/mac/bin/

# build app
cd frontend
# yarn tauri build
yarn dist
cd -

