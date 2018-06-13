FROM node:8
MAINTAINER Phuc PNT. <pn.truongphuc@gmail.com>

ADD packages /proj/packages
ADD specs /proj/specs
ADD .gitignore /proj/.gitignore
ADD package.json /proj/package.json
ADD lerna.json /proj/lerna.json

WORKDIR /proj
RUN npm install 
RUN npm run bootstrap
RUN npm run build

EXPOSE 3003

EXPOSE 5000

ENTRYPOINT [ "npm", "start" ]
