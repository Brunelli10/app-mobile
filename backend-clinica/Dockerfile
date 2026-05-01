FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias para o Prisma e pacotes do OS
RUN apk add --no-cache openssl

# Copiar os arquivos de dependência primeiro
COPY package*.json ./
COPY prisma ./prisma/

# Instalar as dependências e gerar o Prisma Client
RUN npm install
RUN npx prisma generate

# Copiar o resto do código
COPY . .

# Expor a porta 3000
EXPOSE 3000

# Usar ts-node-dev ou nodemon via npm run dev para ambiente de dev
CMD ["npm", "run", "dev"]
