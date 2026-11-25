Cyber Watch

# Overview

Cyber Watch is a web based cybersecurity dashboard that helps users monitor recent security vulnerabilities, understand their severity and explore vulnerability trends. This is done by retrieving and displaying 50 Common Vulnerabilities and Exposures(CVEs) from the National Vulnerability Database(NVD).

## Features

. Fetches recent CVE data from the NVD API.
. Displays vulnerability statistics.
. Filters vulnerabilities by severity.
. Allows users to search vulnerabilities.
. Sorts vulnerability results.
. Displays severity distribution, daily trends and CVSS score charts.
. Caches API data in the browser for 10 minutes using localstorage.
. Provides links to vulnerability information ont the NVD website.
. Allows switching to and from dark and light themes.

### Technology Used

. HTML
. CSS
. Javascript
. NVD CVE API
. Chart.js
. Nginx
. Linux(Ubuntu)

 #### API Source

 Cyber Watch uses the National Vulnerability database API : https://services.nvd.nist.gov/rest/json/2.0
 Chart.js is loaded through a CDN, an internet connection is required for the charts.

 ##### Running Locally

 - Clone the project github repository
 - Open the project folder
 - Start a local web server using VS Code Live Server
 - Open the provided local URL in your browser
Notice: An internet connection is required to retrieve data from the NVD API.

###### Deployment Structure

Cyber watch is deployed across three Ubunu servers using Nginx.
Server

Role

Web01

Hosts the Cyber Watch dashboard

Web02

Hosts a second copy of the dashboard

Lb01

Acts as the Nginx reverse proxy and load balance

####### Deployment Procedure

1. Deploying on Web01

Web01 already had Nginx isntalled and running. So I followed the followin steps:
- From the local project directory, the application files were transfered using scp command
- After connecting to Web01, the files were copied into the Nginx web rooot using sudo cp command
- File permissions were then configured with sudo chmod 664 command
- Then the Nginx configuration was validated using sudo nginx -t command
- Lastly, the application was tested in a browser using the http://3.8.175.197 link.

2. Deploying on Web02

- The application files were also transferred using scp command
- Nginx was installed and started with these commands: 
sudo apt-get update -y, 
sudo apt-get install -y nginx,
sudo systemctl enable nginx,
sudo systemctl start nginx
- The web root directory was then created using sudo mkdir -p command
- The application files were copied into the directory using sudo cp command
- permissions were then configured using sudo chmod 644 command
- Nginx configuration was checked with sudo nginx -t command
- And lastly, the dashboard was tested using http://3.8.101,123 link

3. Configuring the Load balancer

- The load balancer was accessed using SSH
- Nginx was then installed and enabled with the commands below:
sudo apt-get update -y, 
sudo apt-get install -y nginx,
sudo systemctl enable nginx,
sudo systemctl start nginx
- Its status was then checked with sudo systemctl status nginx
- Connectivity from Lb01 to Web01 and Web02 was then tested using these  two commands:
curl -I http://10.30.2.156
curl -I http://10.30.18.166
- Both servers returned HTTP/1.1 OK which confirmed that the load balancer could communicate with both servers
- A backup was then created using sudo cp command
- The configuration file was opened via sudo nano command
- The default configuration was replaced with another one that uses the two servers' private IP addresses and allows Nginx to accept incoming connections on port 80.
- The new configuration syntax was then tested with sudo nginx -t command
- After a success message, the service was reloaded to apply the new configuration using sudo systemctl reload nginx command
- The load balancer was then tested from Lb01 using curl -I http://localhost command
- Then the application was accessed through http://13.40.97.228

4. Verifying traffic distribution between both servers

- Traffic distribution was tested using Nginx access logs on both backend servers.
- First, the access logs were monitored on Web01 and Web02:
 sudo tail -f /var/log/nginx/access.log
- Ten HTTP requests were then sent through the public load balancer:
 for i in {1..10}; do
    curl -s -o /dev/null http://13.40.97.228
 done
- The test was repeated, and the access logs on both servers were inspected.
- Both Web01 and Web02 recorded requests similar to:
 "GET / HTTP/1.0" 200 4728 "-" "curl/8.18.0"

5. Observed results

- Both backend servers received requests through the load balancer.
- Both returned HTTP status 200 OK.
- Both successfully served the dashboard's HTML response.
- The requests appeared in both access logs, demonstrating that traffic was distributed across the two backend servers.
- The results confirmed that Nginx's default round-robin load-balancing configuration was functioning as intended.


6. Deployment Access

The application can be accessed through the following addresses:
. Web01: http://3.8.175.197
. Web02: http://3.8.101.123
. Lb01: http://13.40.97.228
