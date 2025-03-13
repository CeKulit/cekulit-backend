FROM nginx:alpine

COPY nginx-proxy/nginx.conf /etc/nginx/sites-enabled/nginx.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]