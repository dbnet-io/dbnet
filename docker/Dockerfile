FROM ubuntu:focal
ENV HOME /dbnet
RUN mkdir /dbnet
WORKDIR /dbnet
COPY dbnet /dbnet/
RUN chmod -R 777 /dbnet && chmod +x /dbnet/dbnet
ENTRYPOINT ["/dbnet/dbnet"]