# ProjectPulse

## Running the project


Requirements:

- docker
- a directory for uploading files
- mysql database
- npm

Then, you can run the project by following these steps:

- clone the repository
- rename the .env.example file to .env and fill in the required fields, if you want to run tests, you should also copy the .env.example file to .env.test and fill in the required fields

- install the dependencies

```
npm install
```

- run the migrations

```
node ace migration:run
```


- build the docker image

```
docker build -t projectpulse .
```

- run the docker container

```
docker run -d --network=host --name projectpulse-container -v /path/to/uploaded/files:/app/uploads -v /path/to/.env:/app/.env projectpulse
```

- the docker container for test:
    
```
docker run --rm -v /path/to/uploaded/files:/app/uploads -v /path/to/.env:/app/.env -v  /path/to/.env.test:/app/.env.test adonisjs-project node ace test
```

The server will be running on http://localhost:3333

Note that this project is online at https://projectpulse.pautentia.fr

## Documentation

The documentation is available at https://projectpulse.pautentia.fr/docs or in pdf format in the root of the project.




