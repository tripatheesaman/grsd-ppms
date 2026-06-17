# Caddy configuration for PPMS

Add inside the `https://192.168.1.254` server block:

```caddy
handle_path /ppms/uploads/* {
    root * /srv/grsd-ppms/uploads
    file_server
}

handle /ppms* {
    reverse_proxy 127.0.0.1:3007
}
```

Uploads are stored on the host at `/srv/grsd-ppms/uploads` and served directly by Caddy for static performance.
