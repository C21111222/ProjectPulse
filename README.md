# ProjectPulse

Requirements:
- docker
- a directory for uploading files

To run the project:
- clone the repository
```
git clone
cd ProjectPulse
```
- build the docker image
```
docker build -t projectpulse .
```
- run the docker container
```
docker run -d -p 5000:5000 -v /path/to/uploaded/files:/app/uploads /path/to/.env:/app/.env projectpulse
```

The server will be running on http://localhost:3333

