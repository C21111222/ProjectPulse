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
docker run -d --network=host --name projectpulse-container -v /path/to/uploaded/files:/app/uploads -v /path/to/.env:/app/.env projectpulse
```

The server will be running on http://localhost:3333

