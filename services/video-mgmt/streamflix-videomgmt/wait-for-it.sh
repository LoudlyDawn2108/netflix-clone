#!/bin/sh
# wait-for-it.sh: wait for a host and port to be available

set -e

TIMEOUT=15
QUIET=0
HOST=""
PORT=""
STRICT=0 # Initialize STRICT to 0

usage() {
    echo "Usage: $0 host:port [-s] [-t timeout] [-- command args]"
    echo "  -s | --strict               Only execute COMMAND if the test succeeds"
    echo "  -q | --quiet                Don't output any status messages"
    echo "  -t TIMEOUT | --timeout=TIMEOUT"
    echo "                              Timeout in seconds, zero for no timeout"
    echo "  -- COMMAND ARGS             Execute command with args after the test finishes"
    exit 1
}

wait_for() {
    if [ "$QUIET" -eq 0 ]; then echo "Waiting for $HOST:$PORT..."; fi
    for i in `seq $TIMEOUT` ; do
        nc -z "$HOST" "$PORT" > /dev/null 2>&1
        result=$?
        if [ $result -eq 0 ] ; then
            if [ "$QUIET" -eq 0 ]; then echo "$HOST:$PORT is available after $i seconds"; fi
            return 0
        fi
        sleep 1
    done
    echo "Timeout occurred after waiting $TIMEOUT seconds for $HOST:$PORT"
    return 1
}

while [ $# -gt 0 ]
do
    case "$1" in
        *:* )
        HOST=$(printf "%s\n" "$1"| cut -d : -f 1)
        PORT=$(printf "%s\n" "$1"| cut -d : -f 2)
        shift 1
        ;;
        -q | --quiet)
        QUIET=1
        shift 1
        ;;
        -s | --strict)
        STRICT=1
        shift 1
        ;;
        -t)
        TIMEOUT="$2"
        if [ "$TIMEOUT" = "" ]; then break; fi
        shift 2
        ;;
        --timeout=*)
        TIMEOUT="${1#*=}"
        shift 1
        ;;
        --)
        shift
        CMD="$@"
        break
        ;;
        --help)
        usage
        ;;
        *)
        echoerr "Unknown argument: $1"
        usage
        ;;
    esac
done

if [ "$HOST" = "" -o "$PORT" = "" ]; then
    echo "Error: you need to provide a host and port to test."
    usage
fi

if ! command -v nc >/dev/null 2>&1; then
    echo "Error: nc (netcat) is not installed. Please install it."
    exit 1
fi

wait_for

RESULT=$?

if [ "$CMD" != "" ] ; then
    if [ $RESULT -ne 0 -a "$STRICT" -eq 1 ]; then
        echo "Strict mode: refusing to execute command due to timeout"
        exit $RESULT
    fi
    exec $CMD
else
    exit $RESULT
fi
