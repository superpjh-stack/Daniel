# AWS App Runner 배포 스크립트 (ECR 경유)
# 사용법: .\deploy-aws.ps1

param(
    [string]$Region = "ap-northeast-1",
    [string]$AppName = "daniel-church-app",
    [string]$EcrRepo = "daniel-church-app"
)

Write-Host "다니엘 앱 AWS 배포 시작..." -ForegroundColor Cyan

# 1. AWS 계정 ID 확인
Write-Host "`nAWS 계정 확인 중..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text 2>$null
if (-not $accountId) {
    Write-Host "AWS 자격 증명이 설정되지 않았습니다." -ForegroundColor Red
    Write-Host "다음 명령어로 설정하세요:" -ForegroundColor Yellow
    Write-Host "  aws configure" -ForegroundColor White
    exit 1
}
Write-Host "AWS 계정: $accountId" -ForegroundColor Green

$ecrUri = "$accountId.dkr.ecr.$Region.amazonaws.com"
$imageUri = "$ecrUri/$EcrRepo`:latest"

# 2. ECR 리포지토리 생성 (없으면)
Write-Host "`nECR 리포지토리 확인 중..." -ForegroundColor Yellow
$repoExists = aws ecr describe-repositories --repository-names $EcrRepo --region $Region 2>$null
if (-not $repoExists) {
    Write-Host "ECR 리포지토리 생성 중..." -ForegroundColor Yellow
    aws ecr create-repository --repository-name $EcrRepo --region $Region --image-scanning-configuration scanOnPush=true
}
Write-Host "ECR 리포지토리: $EcrRepo" -ForegroundColor Green

# 3. ECR 로그인
Write-Host "`nECR 로그인 중..." -ForegroundColor Yellow
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrUri

# 4. Docker 이미지 빌드 및 푸시
Write-Host "`nDocker 이미지 빌드 중..." -ForegroundColor Yellow
docker build -t $EcrRepo .
docker tag "$EcrRepo`:latest" $imageUri
docker push $imageUri
Write-Host "이미지 푸시 완료: $imageUri" -ForegroundColor Green

# 5. App Runner 서비스 확인/생성
Write-Host "`nApp Runner 배포 중..." -ForegroundColor Yellow
$serviceExists = aws apprunner list-services --region $Region --query "ServiceSummaryList[?ServiceName=='$AppName'].ServiceArn" --output text 2>$null

if ($serviceExists) {
    Write-Host "기존 서비스 업데이트 중..." -ForegroundColor Yellow
    aws apprunner update-service `
        --service-arn $serviceExists `
        --source-configuration "{
            `"ImageRepository`": {
                `"ImageIdentifier`": `"$imageUri`",
                `"ImageRepositoryType`": `"ECR`",
                `"ImageConfiguration`": {
                    `"Port`": `"8080`"
                }
            },
            `"AutoDeploymentsEnabled`": false
        }" `
        --region $Region
} else {
    Write-Host "새 서비스 생성이 필요합니다." -ForegroundColor Yellow
    Write-Host "App Runner 서비스를 AWS 콘솔에서 생성하세요:" -ForegroundColor Yellow
    Write-Host "  1. AWS Console > App Runner > Create service" -ForegroundColor White
    Write-Host "  2. Source: ECR > $imageUri" -ForegroundColor White
    Write-Host "  3. Port: 8080" -ForegroundColor White
    Write-Host "  4. 환경변수: DATABASE_URL, JWT_SECRET 설정" -ForegroundColor White
}

Write-Host "`n배포 완료!" -ForegroundColor Green
Write-Host "App Runner 콘솔에서 서비스 URL을 확인하세요." -ForegroundColor Cyan
