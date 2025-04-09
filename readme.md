# mylaps-to-racemap-forwarder

Our forwarder service connects MyLaps timing systems with the RACEMAP backend to forward the reads/ detections from the timing system to racemap.com.
The service also manages the communication with the MyLaps software.

- opens a port, by default the running machine is **3097**
- listens on localhost IP: **127.0.0.1**
- RACEMAP API token is needed to forward data to racemap.com
- API token is set by using the environment var **RACEMAP_API_TOKEN**

## How to use

1. Generate the API token for your RACEMAP account. It can be found in your user section.
2. Download the service to the computer on which the MyLaps timing software is running.
3. Run the service with the API token as an environment variable.
4. Configure your timing system to send data to the service.
5. The service will forward your data to racemap.com.

## How to run the service

### I just want to use the service

You can download the latest binary for your platform from the here and run it with the following commands.

- [mylaps-to-racemap-forwarder-win-x64-v1.0.0.exe](https://github.com/racemap/mylaps-to-racemap-forwarder/releases/download/v1.0.0/mylaps-to-racemap-forwarder-win-x64-v1.0.0.exe)
- [mylaps-to-racemap-forwarder-linux-x64-v1.0.0](https://github.com/racemap/mylaps-to-racemap-forwarder/releases/download/v1.0.0/mylaps-to-racemap-forwarder-linux-x64-v1.0.0)

#### Windows

```cmd
set RACEMAP_API_TOKEN=your-api-token
.\mylaps-to-racemap-forwarder.exe
```

![image](https://github.com/user-attachments/assets/1d16ec20-4b79-4207-bccc-f7196a679809)

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
