#!/bin/bash

BASE_URL="http://localhost:8080"
IMG_FILE="testbild.jpg"
POST_ID=2

echo "==> 1. GET /posts (anonym)"
curl -s $BASE_URL/posts
echo

echo -e "\n==> 2. GET /posts als Berta"
curl -s -u Berta:Sonne2024 $BASE_URL/posts
echo

echo -e "\n==> 3. GET /posts als Max15"
curl -s -u Max15:Stern3849 $BASE_URL/posts
echo

echo -e "\n==> 4. GET /posts/$POST_ID (anonym)"
curl -s $BASE_URL/posts/$POST_ID
echo

echo -e "\n==> 5. GET /posts/$POST_ID (Berta)"
curl -s -u Berta:Sonne2024 $BASE_URL/posts/$POST_ID
echo

echo -e "\n==> 6. POST /posts (als Max15)"
curl -s -u Max15:Stern3849 -X POST $BASE_URL/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test von Script","content":"Inhalt vom Script"}'
echo

echo -e "\n==> 7. POST /posts (als Berta, verboten)"
curl -s -u Berta:Sonne2024 -X POST $BASE_URL/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Verbotener Versuch","content":"Kein Admin"}'
echo

if [ -f "$IMG_FILE" ]; then
  echo -e "\n==> 8. POST /posts/$POST_ID/image (Bild-Upload)"
  curl -s -u Max15:Stern3849 -X POST "$BASE_URL/posts/$POST_ID/image" \
    -F "file=@$IMG_FILE"
  echo

  echo -e "\n==> 9. GET Bild-Datei direkt:"
  IMAGE_PATH=$(curl -s $BASE_URL/posts/$POST_ID | grep -o '"imagePath":"[^"]*' | cut -d'"' -f4)
  echo "$BASE_URL$IMAGE_PATH"
  curl -s "$BASE_URL$IMAGE_PATH" --output "output.jpg" && echo "Bild gespeichert als output.jpg"
else
  echo "⚠️  Kein Bild gefunden: $IMG_FILE (optional für Upload-Test)"
fi
