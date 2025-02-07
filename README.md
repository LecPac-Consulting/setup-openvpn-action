# Setup OpenVPN action

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)

This repository contains a GitHub action for setting up an OpenVPN client in CI/CD pipelines.
This is useful to access protected resources such as the Kubernetes API Server or the ArgoCD API when using GitHub Cloud runners.

This project is maintained by [LecPac Consulting](https://lecpac-consulting.com/).


## Usage

The action can be used as follows:

```yaml
- name: Set up OpenVPN
  uses: lecpac-consulting/setup-openvpn-action@v1
  with:
    openvpn_config_base64: '${{ secrets.OPENVPN_CONFIG_BASE64 }}'
```

The action requires an OpenVPN client configuration file containing user identity (TLS cert, user/pass auth if any) as a base64-encoded string.

Note: It's recommended to pin the version of the action to a major version number (e.g. `v1`) to get latest fixes while keeping backward compatibility.

## Licence

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
