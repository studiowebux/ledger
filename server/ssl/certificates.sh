# Certificate details
COUNTRY="CA"
STATE="Quebec"
LOCALITY="Sainte-Therese"
ORGANIZATION="Studio Webux"
ORG_UNIT="IT"
COMMON_NAME="unledgerprotocol.com"
EMAIL="admin@unledgerprotocol.com"

openssl genrsa -out root_ca.key 2048

openssl req -x509 -new -nodes -key root_ca.key -sha256 -days 365 -out root_ca.pem \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$COMMON_NAME/emailAddress=$EMAIL"


openssl genrsa -out server.key 2048

openssl req -new -key server.key -out server.csr \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$COMMON_NAME/emailAddress=$EMAIL"


openssl x509 -req -extfile <(printf "subjectAltName=IP:127.0.0.1") -in server.csr -CA root_ca.pem -CAkey root_ca.key -CAcreateserial -out server.crt -days 365 -sha256

# openssl x509 -req -extfile <(printf "subjectAltName=DNS:example.com") -in server.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out server.crt -days 3650 -sha256
