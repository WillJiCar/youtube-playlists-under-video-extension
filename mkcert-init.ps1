$certPath = ".\certs"
$certFile = "$certPath/localhost.pem"
$keyFile = "$certPath/localhost-key.pem"

# Ensure cert directory exists
if (!(Test-Path $certPath)) { New-Item -ItemType Directory -Path $certPath }

# Check if mkcert is installed
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host "Error: mkcert not found. Install it first: https://github.com/FiloSottile/mkcert"
    exit 0
}

# Check if CA is installed
$caInstalled = (mkcert -CAROOT).Trim()
Write-Host "CA Path: $caInstalled"

if (-not (Test-Path "$caInstalled/rootCA.pem")) {
    Write-Host "Installing mkcert local CA..."
    mkcert -install
}

# Generate certs if they don't exist
if (!(Test-Path $certFile) -or !(Test-Path $keyFile)) {
    Write-Host "Generating localhost certificates..."
    mkcert -cert-file $certFile -key-file $keyFile localhost 127.0.0.1 ::1
} else {
    if (-not (Get-Command openssl -ErrorAction SilentlyContinue)) {
        Write-Host "Certifcates exist, but cannot verify because OpenSSL not found."
    } else {
        $generateNew = $false

        # validate existing certs
        $endDate = openssl x509 -noout -enddate -in $certFile
        if ($endDate) {
            # endDate example: notAfter=Sep 15 12:34:56 2025 GMT
            $dateString = $endDate -replace "notAfter=", "" -replace " GMT", ""
            $expiry = [datetime]::ParseExact($dateString.Trim(), "MMM dd HH:mm:ss yyyy", [System.Globalization.CultureInfo]::InvariantCulture)
            if ($expiry -lt (Get-Date)) {
                Write-Host "Certificate expired on $expiry. Regenerating..."
                $generateNew = $true
            } else {
                Write-Host "Certificate is valid until $expiry"
            }
        } else {
            Write-Host "Failed to read certificate. Will generate new one."
            $generateNew = $true
        }

        if ($generateNew) {
            Write-Host "Generating new localhost certificates..."
            if (Get-Command mkcert -ErrorAction SilentlyContinue) {
                mkcert -cert-file $certFile -key-file $keyFile localhost 127.0.0.1 ::1
                Write-Host "Certificates generated"
            }            
        }
        
    }
}

Write-Host "Trusted localhost certificate ready:"
Write-Host "Cert: $certFile"
Write-Host "Key:  $keyFile"
