FROM golang:1.18-alpine AS base

RUN apk update && apk add --no-cache build-base git bash curl linux-headers ca-certificates
WORKDIR /
RUN mkdir -p ./main
COPY ./go.mod ./main/go.mod
COPY ./go.sum ./main/go.sum
WORKDIR /main
RUN go mod download

FROM base AS builder

WORKDIR /main
COPY . .
RUN go build -o /go/bin/main cmd/main/main.go

FROM alpine:latest

ARG UID=1000
ARG GID=1000

RUN apk add ca-certificates
USER $UID
WORKDIR /bin
COPY --from=builder /go/bin/main .

CMD /bin/main
