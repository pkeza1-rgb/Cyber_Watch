# Project Title: Cyber Watch

## 1. Overview

Cyber Watch is a web-based cybersecurity dashboard that helps users monitor recent security vulnerabilities, understand their severity, and explore vulnerability trends.

It retrieves and displays 50 Common Vulnerabilities and Exposures (CVEs) from the National Vulnerability Database (NVD), providing users with useful information about recent security threats.

## 2. Features

- Fetches recent CVE data from the NVD API.
- Displays vulnerability statistics.
- Filters vulnerabilities by severity.
- Allows users to search vulnerabilities.
- Sorts vulnerability results.
- Displays severity distribution, daily trends, and CVSS score charts.
- Caches API data in the browser for 10 minutes using localStorage.
- Provides links to vulnerability information on the NVD website.
- Allows users to switch between dark and light themes.

## 3. Technologies Used

- HTML
- CSS
- JavaScript
- NVD CVE REST API
- Chart.js
- Nginx
- Ubuntu Linux

## 4. API Source and Credits

Cyber Watch uses the National Vulnerability Database API to retrieve CVE information.

- API endpoint: https://services.nvd.nist.gov/rest/json/cves/2.0
- Official API documentation: https://nvd.nist.gov/developers/vulnerabilities
- API provider: National Institute of Standards and Technology (NIST).
- Website: https://nvd.nist.gov/

The current implementation uses the public NVD API endpoint without an API key.

Chart.js is used to display interactive charts and visualize vulnerability statistics.

- Official website: https://www.chartjs.org/
- Documentation: https://www.chartjs.org/docs/latest/

Chart.js is loaded through a CDN, so an internet connection is required for the charts.

## 5. Running Locally

1. Clone the project GitHub repository.
2. Open the project folder.
3. Start a local web server using VS Code Live Server.
4. Open the provided local URL in your browser.

An internet connection is required to retrieve data from the NVD API and load Chart.js.

## 6. Deployment Architecture

Cyber Watch is deployed across three Ubuntu servers using Nginx.

| Server | Role | Public IP | Private IP |
|---|---|---|---|
| Web01 | Hosts the first application instance | 3.8.175.197 | 10.30.2.156 |
| Web02 | Hosts the second application instance | 3.8.101.123 | 10.30.18.166 |
| Lb01 | Nginx reverse proxy and load balancer | 13.40.97.228 | 10.30.10.131 |

The architecture uses two web servers to host identical copies of Cyber Watch and a third server to distribute incoming HTTP requests.

Nginx uses its default round-robin load-balancing method to distribute requests between Web01 and Web02.

## 7. Deployment Procedure

### 7.1 Deploying on Web01

Web01 already had Nginx installed and running.

The following steps were performed:

1. From the local project directory, the application files were transferred using SCP:

```bash
scp -i ~/.ssh/alu_rsa_key index.html style.css java.js ubuntu@3.8.175.197:/tmp/
```

2. After connecting to Web01 using SSH, the files were copied into the Nginx web root:

```bash
sudo cp /tmp/index.html /tmp/style.css /tmp/java.js /var/www/html/
```

3. File permissions were configured:

```bash
sudo chmod 644 /var/www/html/index.html /var/www/html/style.css /var/www/html/java.js
```

4. The Nginx configuration was validated:

```bash
sudo nginx -t
```

5. Finally, the application was tested in a browser:

http://3.8.175.197

The dashboard loaded successfully.

### 7.2 Deploying on Web02

The same application files were transferred to Web02 using SCP:

```bash
scp -i ~/.ssh/alu_rsa_key index.html style.css java.js ubuntu@3.8.101.123:/tmp/
```

After connecting to Web02, Nginx was installed and started because the web root directory was initially unavailable.

```bash
sudo apt-get update -y
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

The web root directory was created:

```bash
sudo mkdir -p /var/www/html
```

The application files were copied into the directory:

```bash
sudo cp /tmp/index.html /tmp/style.css /tmp/java.js /var/www/html/
```

File permissions were configured:

```bash
sudo chmod 644 /var/www/html/index.html /var/www/html/style.css /var/www/html/java.js
```

The Nginx configuration was checked:

```bash
sudo nginx -t
```

The dashboard was then tested using:

http://3.8.101.123

The application loaded successfully.

## 8. Configuring the Load Balancer on Lb01

### 8.1 Installing and Starting Nginx

The load balancer was accessed using SSH:

```bash
ssh -i ~/.ssh/alu_rsa_key ubuntu@13.40.97.228
```

Nginx was installed and enabled:

```bash
sudo apt-get update -y
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Its status was checked:

```bash
sudo systemctl status nginx
```

Nginx was confirmed to be active and running.

### 8.2 Testing Connectivity Between Servers

Before configuring the reverse proxy, connectivity from Lb01 to both web servers was tested:

```bash
curl -I http://10.30.2.156
curl -I http://10.30.18.166
```

Both servers returned:

```text
HTTP/1.1 200 OK
```

This confirmed that the load balancer could communicate with both backend servers through their private IP addresses.

### 8.3 Backing Up the Existing Configuration

A backup of the original Nginx default configuration was created:

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

The configuration file was opened:

```bash
sudo nano /etc/nginx/sites-available/default
```

### 8.4 Configuring the Upstream Servers

The default configuration was replaced with the following:

```nginx
upstream cyber_watch_servers {
    server 10.30.2.156:80;
    server 10.30.18.166:80;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://cyber_watch_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8.5 Explanation of the Configuration

**Upstream block**

The upstream block defines the two backend web servers using their private IP addresses and HTTP port 80.

Nginx distributes requests between the servers using its default round-robin method.

**Server block**

The server block configures Nginx to listen for incoming HTTP connections on port 80.

**Proxy configuration**

The `proxy_pass` directive forwards incoming requests to the upstream group rather than serving application files directly from the load balancer.

**Forwarded headers**

The following directives ensure that important request information is passed to the backend servers:

- `Host` preserves the original host header.
- `X-Real-IP` passes the original client IP address.
- `X-Forwarded-For` preserves the forwarding chain.
- `X-Forwarded-Proto` indicates the original request protocol.

These configurations allow the load balancer to communicate correctly with the backend servers.

### 8.6 Validating and Reloading Nginx

After saving the configuration, its syntax was tested:

```bash
sudo nginx -t
```

Nginx reported that the syntax was valid and the test was successful.

The service was then reloaded to apply the new configuration:

```bash
sudo systemctl reload nginx
```

## 9. Testing the Load Balancer

### 9.1 Testing the Load Balancer Locally

The load balancer was tested from Lb01 using:

```bash
curl -I http://localhost
```

This checked whether Nginx could accept incoming requests and forward them to a backend server.

### 9.2 Accessing the Application Through the Load Balancer

The application was accessed through the public load balancer address:

http://13.40.97.228

The Cyber Watch dashboard loaded successfully, confirming that the reverse proxy was forwarding requests correctly.

### 9.3 Verifying Traffic Distribution Between Both Servers

Traffic distribution was tested using Nginx access logs on both backend servers.

First, the access logs were monitored on Web01 and Web02:

```bash
sudo tail -f /var/log/nginx/access.log
```

Ten HTTP requests were sent through the public load balancer:

```bash
for i in {1..10}; do
    curl -s -o /dev/null http://13.40.97.228
done
```

The test was repeated, and the access logs on both servers were inspected.

Both Web01 and Web02 recorded requests similar to:

```text
"GET / HTTP/1.0" 200 4728 "-" "curl/8.18.0"
```

### 9.4 Observed Results

- Both backend servers received requests through the load balancer.
- Both returned HTTP status 200 OK.
- Both successfully served the dashboard's HTML response.
- Requests appeared in both access logs.
- The results demonstrated that traffic was being distributed across both backend servers.

This confirmed that Nginx's default round-robin load-balancing configuration was functioning as intended.

## 10. Deployment Access

The application can be accessed through the following addresses:

- Web01: http://3.8.175.197
- Web02: http://3.8.101.123
- Lb01: http://13.40.97.228

The recommended public entry point is the load balancer address.

## 11. Challenges Encountered and Solutions

**1. Missing Nginx web root on Web02**

Web02 initially did not have the expected `/var/www/html` directory.
Solution: Nginx was installed, the web root directory was created, and the application files were deployed.

**2. Configuring the load balancer**

The load balancer initially had the default Nginx configuration, which served local files rather than forwarding requests to backend servers.
Solution: The default configuration was updated with an upstream group containing both web servers and a reverse proxy configuration.

**3. Verifying communication between servers**

It was necessary to confirm that Lb01 could reach both backend servers.
Solution: Connectivity was tested using curl against both private IP addresses. Both returned HTTP 200 OK.

**4. Verifying traffic distribution**

It was necessary to confirm that requests were reaching both backend servers rather than only one.
Solution: Nginx access logs were monitored on Web01 and Web02 while multiple requests were sent through the public load balancer. Both servers recorded successful HTTP 200 response.

## 12. API Keys and Login Credentials

The current Cyber Watch implementation uses the public NVD API endpoint without requiring an API key.
The application does not currently implement user authentication or require login credentials.

## 13. Submission Links

- GitHub repository:
- Live application: http://13.40.97.228
- Demo video: https://youtu.be/K1PPkt8hEYg
