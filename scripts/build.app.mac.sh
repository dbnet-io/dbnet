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

# build app
cd frontend
yarn tauri build
cd -

