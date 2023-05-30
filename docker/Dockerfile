FROM ubuntu:focal

# Need this to avoid tls: failed to verify certificate: x509: certificate signed by unknown authority
RUN apt update && apt install -y ca-certificates && update-ca-certificates && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists /var/cache/apt

ENV HOME /dbnet
RUN mkdir /dbnet
WORKDIR /dbnet
COPY dbnet /dbnet/
RUN chmod -R 777 /dbnet && chmod +x /dbnet/dbnet
ENTRYPOINT ["/dbnet/dbnet"]