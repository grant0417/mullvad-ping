# Mullvad Ping

Gets the list of Mullvad servers with the best latency according to `ping`.

Run

```bash
deno run --allow-net --allow-run https://raw.githubusercontent.com/grant0417/mullvad-ping/main/script.ts
```

Build Exe

```
deno compile --allow-net --allow-run -o mullvad-ping https://raw.githubusercontent.com/grant0417/mullvad-ping/main/script.ts
```

Note: The Windows version of `ping` is somewhat more limited than that of Linux
or Mac so the times are less precice and the script will take ~5x longer.

## Usage

```
Usage: script [OPTION]
    --country <code>    the country you want to query (eg. us, gb, de)
    --list-countries    lists the available countries
    --type <type>       the type of server to query (openvpn, bridge, wireguard, all)
    --count <n>         the number of pings to the server (default 3)
    --interval <i>      the interval between pings in seconds (default/min 0.2)
    --top <n>           the number of top servers to show, (0=all)
    --port-speed <n>    only show servers with at least n Gigabit port speed
    --run-mode <type>   only show servers running from (all, ram, disk)
    --help              usage information
```

## How to run on Windows Subsystem for Linux (WSL) [w/ default distro Ubuntu 20.04 LTS]  

Pre-requisites:

Windows Subsystem for Linux (WSL): [How To Install Linux on Windows with WSL](https://learn.microsoft.com/en-us/windows/wsl/install)

Deno: [How To Install the Deno JavaScript Runtime on Ubuntu 20.04](https://www.digitalocean.com/community/tutorials/how-to-install-the-deno-javascript-runtime-on-ubuntu-20-04#step-1-downloading-deno)

Now you can run the script:

```
deno run --allow-net --allow-run https://raw.githubusercontent.com/grant0417/mullvad-ping/main/script.ts
```
