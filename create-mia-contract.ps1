# Script creation contrat Mia Dreams and Co
$API = "https://thinking-9b5j.onrender.com/api"

$securePass = Read-Host "Mot de passe du dashboard" -AsSecureString
$creds = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
)

Write-Host ""
Write-Host "[1/2] Connexion..." -ForegroundColor Yellow

$loginBody = '{"email":"imulhomabiala@gmail.com","password":"' + $creds + '"}'

try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $loginResp = Invoke-RestMethod -Uri "$API/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable session -ErrorAction Stop
    Write-Host "[OK] Connecte en tant que $($loginResp.email)" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Connexion echouee : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Creation du contrat Mia Dreams and Co..." -ForegroundColor Yellow

$desc = "- Site public (frontend React.js) - Pages Home, Boutique e-commerce, Galerie, Blog/Podcast, Marques, A Propos, Contact, Reservation, Panier, Commande`n"
$desc += "- Systeme de paiement - Panier, tunnel de commande avec saisie client, confirmation par email`n"
$desc += "- Interface administration - Tableau de bord, gestion produits/collections, commandes, reservations, blog, galerie`n"
$desc += "- Point de Vente (POS) - Caisse digitale, catalogue, panier, paiement Especes/Wave, recu thermique imprimable et envoi WhatsApp`n"
$desc += "- Systeme de facturation - Generation de factures A4 au format HTML permanent`n"
$desc += "- Parametres dynamiques - Logo, coordonnees, reseaux sociaux, marques, catalogues synchronises sur tout le site`n"
$desc += "- Backend API REST (Node.js/Express) - Auth JWT, Cloudinary, MongoDB, routes securisees`n"
$desc += "- Deploiement - Frontend Netlify, Backend Render, base de donnees MongoDB Atlas`n"
$desc += "- Integrations - WhatsApp Business, Cloudinary, Google Fonts"

$paie = "- 30% a la signature du contrat (acompte) : 150 000 FCFA`n"
$paie += "- 40% a la livraison de la version beta : 200 000 FCFA`n"
$paie += "- 30% a la mise en production finale : 150 000 FCFA`n"
$paie += "Modes de paiement : Virement bancaire, Wave, Orange Money, Especes"

$del = "Developpement debute en 2025 - Livraison en production le 14 mai 2026`n"
$del += "Garantie de 30 jours a compter de la date de livraison finale"

$notes = "Site accessible a : miadreams.netlify.app`n"
$notes += "Maison de mode africaine basee a Abidjan, Cote d'Ivoire"

$body = @{
    clientName    = "Mia Dreams and Co"
    clientEmail   = "contact@mia-dreams.com"
    clientPhone   = ""
    clientAddress = "Abidjan, Cote d'Ivoire"
    projectType   = "Developpement Web E-commerce"
    description   = $desc
    amount        = 500000
    currency      = "XOF"
    startDate     = "2025-01-01"
    endDate       = "2026-05-14"
    status        = "signe"
    paiement      = $paie
    delais        = $del
    notes         = $notes
}

$contractBody = $body | ConvertTo-Json -Compress

try {
    $res = Invoke-RestMethod -Uri "$API/contracts" -Method Post -Body $contractBody -ContentType "application/json" -WebSession $session -ErrorAction Stop
    Write-Host ""
    Write-Host "[OK] Contrat cree avec succes !" -ForegroundColor Green
    Write-Host "  Reference : $($res.number)" -ForegroundColor Cyan
    Write-Host "  Client    : $($res.clientName)" -ForegroundColor Cyan
    Write-Host "  Montant   : 500 000 XOF" -ForegroundColor Cyan
} catch {
    Write-Host "[ERREUR] Creation echouee : $($_.Exception.Message)" -ForegroundColor Red
}
