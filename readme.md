# mylaps-to-racemap-forwarder

Our forwarder service connects MyLaps timing systems with the RACEMAP backend to forward the reads/ detections from the timing system to racemap.com.
The service also manages the communication with the MyLaps software.

- opens a port, by default the running machine is **3097**
- listens on localhost IP: **127.0.0.1**
- RACEMAP API token is needed to forward data to racemap.com
- API token is set by using the environment var **RACEMAP_API_TOKEN**

![image](./docs/information-flow.excalidraw.svg)

## How to use

1. Generate the API token for your RACEMAP account. It can be found in your user section.
2. Download the service to the computer on which the MyLaps timing software is running.
3. Run the service with the API token as an environment variable.
4. Configure your timing system to send data to the service.
5. The service will forward your data to racemap.com.

## How to run the service

### I just want to use the service

You can download the latest binary for your platform from the here and run it with the following commands.

- [mylaps-to-racemap-forwarder-win-x64-v1.0.3.exe](https://github.com/racemap/mylaps-to-racemap-forwarder/releases/download/v1.0.3/mylaps-to-racemap-forwarder-win-x64-v1.0.3.exe)
- [mylaps-to-racemap-forwarder-linux-x64-v1.0.3](https://github.com/racemap/mylaps-to-racemap-forwarder/releases/download/v1.0.3/mylaps-to-racemap-forwarder-linux-x64-v1.0.3)

#### Windows

Keep in mind the application is a cli program, so you need to run it from the command line.

1. Press `Windows + R` and type `cmd` to open the command line
2. Navigate to the folder where you downloaded the binary
3. Run the binary with the API token as an environment variable

Please make shure that you excute the binary from a folder with write access, otherwise the application will not be able to create the log file.

You could also add the following lines to a start.bat file and run it from there. Then you can double click the start.bat file to run the service.

```bat
set RACEMAP_API_TOKEN=your-api-token
mylaps-to-racemap-forwarder.exe
```

After a successful start you should see the following output in the command line:

![image](https://github.com/user-attachments/assets/893a0d7e-af4d-400b-a9fc-5a515fedd329)

#### Linux

```bash
export RACEMAP_API_TOKEN=your-api-token
./mylaps-to-racemap-forwarder
```

### I know what I am doing

You can checkout the repository and run the service with the following commands. (requires nodejs 18 and yarn 4 to be installed)

```bash
  git clone git@github.com:racemap/mylaps-to-racemap-forwarder.git
  cd mylaps-to-racemap-forwarder
  yarn install
  touch .env
  sed -i '/^RACEMAP_API_TOKEN=/d' .env && echo "RACEMAP_API_TOKEN=your-api-token" >> .env
  yarn start
```

## Possible settings

You can change the defaults of the service by overriding the following environment variables

| Variable          | Default             | Description                                                                                                   |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| RACEMAP_API_TOKEN | ''                  | The API Token is required to send data to RACEMAP                                                             |
| LISTEN_MODE       | private             | The mode the service listens on, can be private or public. private binds to 127.0.0.1 public binds to 0.0.0.0 |
| LISTEN_PORT       | 3097                | The port the service listens on                                                                               |
| RACEMAP_API_HOST  | https://racemap.com | The host to send the requests to                                                                              |
