set -e  # exit on error

# build frontend
cd frontend
yarn build
cd -

# copy dist
rm -rf server/app
cp -r frontend/build server/app

# back backend 
mkdir -p frontend/resources/mac/bin/
name=dbnet-x86_64-apple-darwin
if [ "$(arch)" == "arm64" ]; then
  name=dbnet-arm64-apple-darwin
fi

go build -o $name
/bin/cp -f $name frontend/resources/mac/bin/

# build app
cd frontend
yarn dist
cd -

