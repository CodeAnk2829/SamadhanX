FROM node:18

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

COPY package*.json ./
# Also copy pnpm-lock.yaml if you have one
COPY pnpm-lock.yaml* ./

RUN pnpm install esbuild

COPY . .
RUN cd ./packages/db
RUN pnpm install
RUN npx prisma generate 
RUN cd ../..
RUN pnpm install


# RUN pnpm run build
RUN pnpm run build


RUN cd ./apps/api
RUN pnpm run build
RUN cd ..


RUN cd ./apps/processor
RUN pnpm run build
RUN cd ..


RUN cd ./apps/worker
RUN pnpm run build
RUN cd ..


RUN cd ./apps/websocket
RUN pnpm run build
RUN cd ..



EXPOSE 3000
CMD ["pnpm", "run", "dev"]