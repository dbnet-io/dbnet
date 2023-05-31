set -e

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SSH_SERVER_URL "
cd ~/_/vm/docker
docker-compose pull 'dbnet-test'
docker rm -f 'dbnet-test'
docker-compose up -d 'dbnet-test'
"
