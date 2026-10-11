# ===== Этап 1: Сборка =====
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum
COPY go.mod go.sum ./
RUN go mod download

# Копируем исходники
COPY . .

# Собираем бинарник
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# ===== Этап 2: Запуск =====
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Копируем бинарник из первого этапа
COPY --from=builder /app/server .

# Создаём папки для загрузок
RUN mkdir -p uploads/avatars uploads/posts uploads/groups

EXPOSE 8080

CMD ["./server"]