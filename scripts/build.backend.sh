set -e  # exit on error

# to set binary path in case of errors
rm -rf /dbnet
cp -r . /dbnet
cd /dbnet
rm -rf .git

# update go.mod
bash scripts/prep.gomod.sh

GOOS=darwin GOARCH=amd64 go build -o dbnet-x86_64-apple-darwin
GOOS=linux GOARCH=amd64 go build -o dbnet-x86_64-unknown-linux-gnu

/bin/cp -f dbnet /__/bin/dbnet

rm -rf /dbnet
