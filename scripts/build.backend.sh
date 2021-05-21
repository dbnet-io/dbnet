set -e  # exit on error

# to set binary path in case of errors
rm -rf /dbnet
cp -r . /dbnet
cd /dbnet
rm -rf .git

# update go.mod
bash scripts/prep.gomod.sh

rm -rf server/app
cp -r /__/tmp/scruto-webapp server/app
GOOS=linux GOARCH=amd64 go build -o dbnet *.go
/bin/cp -f dbnet /__/bin/dbnet

rm -rf /dbnet
