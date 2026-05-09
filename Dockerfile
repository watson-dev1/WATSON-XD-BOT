FROM quay.io/qasimtech/WATSON-XD-BOT:latest

WORKDIR /root/WATSON-XD-BOT

RUN git clone https://github.com/watson-dev1/WATSON-XD-BOT . && \
    npm install

EXPOSE 5000

CMD ["npm", "start"]
