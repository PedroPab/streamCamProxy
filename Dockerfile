# Utiliza una imagen base ligera de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /app    

# Copia solo los archivos necesarios para instalar dependencias
COPY package.json ./
COPY package-lock.json ./

# Instala solo las dependencias de producción
RUN npm ci --omit=dev --no-optional

# Copia el resto de la aplicación
COPY . .

# Expone el puerto (ajusta si tu app usa otro)
EXPOSE ${PORT}

# Comando por defecto para iniciar la app
CMD ["node", "server.js"]
