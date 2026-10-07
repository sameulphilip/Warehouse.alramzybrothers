# Export data from RamixDB (SQL Server) to database_data.js

$server = "45.245.212.98,1433"
$database = "RamixDB"
$sqlUser = "sa"
$sqlPass = $env:RAMIX_SQL_PASS
if (-not $sqlPass) { throw "Set RAMIX_SQL_PASS before running this script." }

# Products
Write-Host "Exporting products..." -ForegroundColor Green
$productsQuery = @"
SELECT 
    p.ProductId,
    p.ProductCode,
    p.ProductName,
    p.ProductType,
    p.SalesTax,
    p.OpeningStock,
    p.ProductStock,
    p.TotalProductStock,
    p.ReOrderLevel,
    p.UnitName,
    p.DefaultSalesQty,
    p.DefaultPurchaseQty,
    p.Weight,
    CAST(ISNULL(SUM(i.InQuantity - ISNULL(i.OutQuantity, 0)), 0) AS INT) as InventoryQuantity
FROM tblProducts p
LEFT JOIN tblInventory i ON p.ProductId = i.ProductID
WHERE p.ProductCode IS NOT NULL
GROUP BY 
    p.ProductId,
    p.ProductCode,
    p.ProductName,
    p.ProductType,
    p.SalesTax,
    p.OpeningStock,
    p.ProductStock,
    p.TotalProductStock,
    p.ReOrderLevel,
    p.UnitName,
    p.DefaultSalesQty,
    p.DefaultPurchaseQty,
    p.Weight
ORDER BY p.ProductCode
"@

# Console output encoding
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$products = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $productsQuery -h -1 -W -s"," -f 65001 2>&1 | 
    Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' -and $_ -notmatch 'ProductId' } |
    ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 14) {
            try {
                $id = [decimal]($parts[0].Trim() -replace '[^0-9.]', '')
                $code = $parts[1].Trim()
                # Keep original text
                $name = $parts[2].Trim()
                $type = [int]($parts[3].Trim() -replace '[^0-9]', '')
                $salesTax = [decimal]($parts[4].Trim() -replace '[^0-9.]', '')
                $openingStock = [decimal]($parts[5].Trim() -replace '[^0-9.]', '')
                $productStock = [decimal]($parts[6].Trim() -replace '[^0-9.]', '')
                $totalStock = [decimal]($parts[7].Trim() -replace '[^0-9.]', '')
                $reOrderLevel = [decimal]($parts[8].Trim() -replace '[^0-9.]', '')
                $unitName = if ($parts[9].Trim() -eq 'NULL') { '' } else { $parts[9].Trim() }
                $defaultSalesQty = [decimal]($parts[10].Trim() -replace '[^0-9.]', '')
                $defaultPurchaseQty = [decimal]($parts[11].Trim() -replace '[^0-9.]', '')
                $weight = [decimal]($parts[12].Trim() -replace '[^0-9.]', '')
                $inventoryQty = [int]($parts[13].Trim() -replace '[^0-9]', '')
                
                if ($code -and $name) {
                    [PSCustomObject]@{
                        id = $id
                        code = $code
                        name = $name
                        type = $type
                        salesTax = $salesTax
                        openingStock = $openingStock
                        productStock = $productStock
                        totalStock = $totalStock
                        reOrderLevel = $reOrderLevel
                        unitName = $unitName
                        defaultSalesQty = $defaultSalesQty
                        defaultPurchaseQty = $defaultPurchaseQty
                        weight = $weight
                        inventoryQuantity = $inventoryQty
                    }
                }
            } catch {
                # تجاهل الأخطاء في السطور التالفة
            }
        }
    }

# Clients
Write-Host "Exporting clients..." -ForegroundColor Green
$clientsQuery = @"
SELECT 
    ClientId,
    ClientName,
    ISNULL(SalesManId, 0) as SalesManId,
    ISNULL(RegionId, 0) as RegionId
FROM tblClients
WHERE ClientName IS NOT NULL
ORDER BY ClientName
"@

$clients = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $clientsQuery -h -1 -W -s"," -f 65001 2>&1 |
    Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' } |
    ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 4) {
            $id = [int]($parts[0].Trim() -replace '[^0-9]', '')
            $name = $parts[1].Trim()
            $salesman = [int]($parts[2].Trim() -replace '[^0-9]', '')
            $region = [int]($parts[3].Trim() -replace '[^0-9]', '')
            if ($name) {
                [PSCustomObject]@{
                    id = $id
                    name = $name
                    salesman = $salesman
                    region = $region
                }
            }
        }
    }

# Suppliers
Write-Host "Exporting suppliers..." -ForegroundColor Green
$suppliersQuery = @"
SELECT 
    SupplierID,
    SupplierName,
    ISNULL(CountryID, 0) as CountryID,
    ISNULL(EMail, '') as EMail,
    ISNULL(WebSite, '') as WebSite
FROM tblSuppliers
WHERE SupplierName IS NOT NULL
ORDER BY SupplierName
"@

$suppliers = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $suppliersQuery -h -1 -W -s"," -f 65001 2>&1 |
    Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' } |
    ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 3) {
            $id = [int]($parts[0].Trim() -replace '[^0-9]', '')
            $name = $parts[1].Trim()
            $country = [int]($parts[2].Trim() -replace '[^0-9]', '')
            $email = if ($parts.Length -ge 4) { $parts[3].Trim() } else { '' }
            $website = if ($parts.Length -ge 5) { $parts[4].Trim() } else { '' }
            if ($name) {
                [PSCustomObject]@{
                    id = $id
                    name = $name
                    country = $country
                    email = $email
                    website = $website
                }
            }
        }
    }

# Selling invoices
Write-Host "Exporting selling invoices..." -ForegroundColor Green
$sellingInvoicesQuery = @"
SELECT
    si.SellingInvoiceID,
    si.SellingInvoiceNo,
    si.SellingInvoiceDate,
    si.ClientID,
    ISNULL(c.ClientName, '') as ClientName,
    ISNULL(si.SellingInvoiceTotalAmount, 0) as TotalAmount,
    ISNULL(si.TotalCollectedAmount, 0) as PaidAmount,
    ISNULL(si.NotCollectedAmount, 0) as RemainingAmount
FROM tblSellingInvoice si
LEFT JOIN tblClients c ON si.ClientID = c.ClientId
WHERE si.SellingInvoiceNo IS NOT NULL
ORDER BY si.SellingInvoiceID DESC
"@

$sellingInvoices = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $sellingInvoicesQuery -h -1 -W -s"," -f 65001 2>&1 |
    Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' -and $_ -notmatch 'SellingInvoiceID' } |
    ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 8) {
            try {
                $id = [int]($parts[0].Trim() -replace '[^0-9]', '')
                $invoiceNo = $parts[1].Trim()
                $date = $parts[2].Trim()
                $clientId = [int]($parts[3].Trim() -replace '[^0-9]', '')
                $clientName = $parts[4].Trim()
                $total = [decimal]($parts[5].Trim() -replace '[^0-9.]', '')
                $paid = [decimal]($parts[6].Trim() -replace '[^0-9.]', '')
                $remaining = [decimal]($parts[7].Trim() -replace '[^0-9.]', '')
                
                if ($invoiceNo) {
                    [PSCustomObject]@{
                        id = $id
                        invoiceNo = $invoiceNo
                        date = $date
                        clientId = $clientId
                        clientName = $clientName
                        total = $total
                        paid = $paid
                        remaining = $remaining
                    }
                }
            } catch {
                # تجاهل الأخطاء
            }
        }
    }

# Purchase invoices
Write-Host "Exporting purchase invoices..." -ForegroundColor Green

# Read purchase-invoice columns to adapt to schema
$purchaseCols = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tblPurchaseInvoice' ORDER BY ORDINAL_POSITION" -h -1 -W -f 65001 2>&1 |
    Where-Object { $_ -and $_ -notmatch '^-+$' } |
    ForEach-Object { $_.Trim() }

function Find-FirstColumn($candidates, $cols) {
    foreach ($c in $candidates) {
        if ($cols -contains $c) { return $c }
    }
    return $null
}

$piIdCol = Find-FirstColumn @('PurchaseInvoiceID','PurchaseInvoiceId','ID','InvoiceID') $purchaseCols
$piNoCol = Find-FirstColumn @('PurchaseInvoiceNo','PurchaseInvoiceNO','InvoiceNo','InvoiceNO') $purchaseCols
$piDateCol = Find-FirstColumn @('PurchaseInvoiceDate','InvoiceDate','PurchaseInvDate','DocumentDate') $purchaseCols
$piSupplierIdCol = Find-FirstColumn @('SupplierID','SupplierId') $purchaseCols
$piTotalCol = Find-FirstColumn @('PurchaseInvoiceTotalAmount','PurchaseInvoiceTotal','TotalAmount','TotalInvoiceAmount','PurchaseInvoiceTotal') $purchaseCols
$piPaidCol = Find-FirstColumn @('TotalPaidAmount','TotalPayedAmount','PaidAmount','TotalPayingAmount','TotalPaid','TotalPayed') $purchaseCols
$piRemainingCol = Find-FirstColumn @('NotPaidAmount','NotPayedAmount','RemainingAmount','NotCollectedAmount','NotPaid','NotPayed') $purchaseCols

if (-not $piIdCol -or -not $piNoCol) {
    Write-Host "WARNING: Could not detect PurchaseInvoice ID/No columns; skipping purchase invoices export." -ForegroundColor Yellow
    $purchaseInvoices = @()
} else {
    $dateExpr = if ($piDateCol) { "pi.[$piDateCol]" } else { "NULL" }
    $supplierIdExpr = if ($piSupplierIdCol) { "pi.[$piSupplierIdCol]" } else { "0" }
    $joinSupplier = if ($piSupplierIdCol) { "LEFT JOIN tblSuppliers s ON pi.[$piSupplierIdCol] = s.SupplierID" } else { "" }
    $supplierNameExpr = if ($piSupplierIdCol) { "ISNULL(s.SupplierName,'')" } else { "''" }
    $totalExpr = if ($piTotalCol) { "ISNULL(pi.[$piTotalCol],0)" } else { "0" }
    $paidExpr = if ($piPaidCol) { "ISNULL(pi.[$piPaidCol],0)" } else { "0" }
    $remainingExpr = if ($piRemainingCol) { "ISNULL(pi.[$piRemainingCol],($totalExpr - $paidExpr))" } else { "($totalExpr - $paidExpr)" }

    $purchaseInvoicesQuery = @"
SELECT
    pi.[$piIdCol] AS PurchaseInvoiceID,
    pi.[$piNoCol] AS PurchaseInvoiceNo,
    $dateExpr AS PurchaseInvoiceDate,
    $supplierIdExpr AS SupplierID,
    $supplierNameExpr AS SupplierName,
    $totalExpr AS TotalAmount,
    $paidExpr AS PaidAmount,
    $remainingExpr AS RemainingAmount
FROM tblPurchaseInvoice pi
$joinSupplier
WHERE pi.[$piNoCol] IS NOT NULL
ORDER BY pi.[$piIdCol] DESC
"@

    $purchaseInvoices = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $purchaseInvoicesQuery -h -1 -W -s"," -f 65001 2>&1 |
        Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' -and $_ -notmatch 'PurchaseInvoiceID' } |
        ForEach-Object {
            $parts = $_ -split ','
            if ($parts.Length -ge 8) {
                try {
                    $id = [int]($parts[0].Trim() -replace '[^0-9]', '')
                    $invoiceNo = $parts[1].Trim()
                    $date = $parts[2].Trim()
                    $supplierId = [int]($parts[3].Trim() -replace '[^0-9]', '')
                    $supplierName = $parts[4].Trim()
                    $total = [decimal]($parts[5].Trim() -replace '[^0-9.]', '')
                    $paid = [decimal]($parts[6].Trim() -replace '[^0-9.]', '')
                    $remaining = [decimal]($parts[7].Trim() -replace '[^0-9.]', '')

                    if ($invoiceNo) {
                        [PSCustomObject]@{
                            id = $id
                            invoiceNo = $invoiceNo
                            date = $date
                            supplierId = $supplierId
                            supplierName = $supplierName
                            total = $total
                            paid = $paid
                            remaining = $remaining
                        }
                    }
                } catch {
                    # تجاهل الأخطاء
                }
            }
        }
}

# Stores
Write-Host "Exporting stores..." -ForegroundColor Green
$storesQuery = @"
SELECT
    StoreID,
    StoreName,
    ISNULL(Address,'') as Address,
    ISNULL(PhoneNo,'') as PhoneNo,
    ISNULL(MobilNo,'') as MobilNo,
    ISNULL(StoreType,0) as StoreType
FROM tblStores
ORDER BY StoreID
"@

$stores = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $storesQuery -h -1 -W -s"," -f 65001 2>&1 |
    Where-Object { $_ -match ',' -and $_ -notmatch '^-+$' -and $_ -notmatch 'StoreID' } |
    ForEach-Object {
        $parts = $_ -split ','
        if ($parts.Length -ge 6) {
            try {
                [PSCustomObject]@{
                    id = [int]($parts[0].Trim() -replace '[^0-9]', '')
                    name = $parts[1].Trim()
                    address = $parts[2].Trim()
                    phone = $parts[3].Trim()
                    mobile = $parts[4].Trim()
                    storeType = [int]($parts[5].Trim() -replace '[^0-9]', '')
                }
            } catch {
                # ignore
            }
        }
    }

# Stock by store (current qty per product per store) - non-zero only
Write-Host "Exporting stock by store..." -ForegroundColor Green
$stockByStoreQuery = @"
SELECT
    i.FromToStoreID AS StoreID,
    ISNULL(s.StoreName,'') AS StoreName,
    i.ProductID AS ProductID,
    ISNULL(p.ProductCode,'') AS ProductCode,
    ISNULL(p.ProductName,'') AS ProductName,
    SUM(ISNULL(i.InQuantity,0) - ISNULL(i.OutQuantity,0)) AS Qty
FROM tblInventory i
JOIN tblStores s ON s.StoreID = i.FromToStoreID
JOIN tblProducts p ON p.ProductId = i.ProductID
GROUP BY i.FromToStoreID, s.StoreName, i.ProductID, p.ProductCode, p.ProductName
HAVING SUM(ISNULL(i.InQuantity,0) - ISNULL(i.OutQuantity,0)) <> 0
ORDER BY StoreID, ProductCode
"@

$stockByStore = sqlcmd -S $server -U $sqlUser -P $sqlPass -C -d $database -Q $stockByStoreQuery -h -1 -W -s"|" -f 65001 2>&1 |
    Where-Object { $_ -and $_ -notmatch '^-+$' -and $_ -notmatch 'StoreID\|' } |
    ForEach-Object {
        $parts = $_ -split '\|'
        if ($parts.Length -ge 6) {
            try {
                [PSCustomObject]@{
                    storeId = [int]($parts[0].Trim() -replace '[^0-9]', '')
                    storeName = $parts[1].Trim()
                    productId = [int]($parts[2].Trim() -replace '[^0-9]', '')
                    productCode = $parts[3].Trim()
                    productName = $parts[4].Trim()
                    qty = [decimal]($parts[5].Trim() -replace '[^0-9\.\-]', '')
                }
            } catch {
                # ignore
            }
        }
    }

# Write JavaScript file
Write-Host "Writing database_data.js..." -ForegroundColor Green
$jsContent = @"
// Exported data: products, clients, suppliers, selling & purchase invoices
// تاريخ التصدير: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

const productsData = $(($products | ConvertTo-Json -Depth 10));
const clientsData = $(($clients | ConvertTo-Json -Depth 10));
const suppliersData = $(($suppliers | ConvertTo-Json -Depth 10));
const sellingInvoicesData = $(($sellingInvoices | ConvertTo-Json -Depth 10));
const purchaseInvoicesData = $(($purchaseInvoices | ConvertTo-Json -Depth 10));
const storesData = $(($stores | ConvertTo-Json -Depth 10));
const stockByStoreData = $(($stockByStore | ConvertTo-Json -Depth 10));

// تحديث البيانات في الصفحة
if (typeof productsData !== 'undefined') {
    window.productsDataFromDB = productsData;
}
if (typeof clientsData !== 'undefined') {
    window.clientsDataFromDB = clientsData;
}
if (typeof suppliersData !== 'undefined') {
    window.suppliersDataFromDB = suppliersData;
}
if (typeof sellingInvoicesData !== 'undefined') {
    window.sellingInvoicesDataFromDB = sellingInvoicesData;
}
if (typeof purchaseInvoicesData !== 'undefined') {
    window.purchaseInvoicesDataFromDB = purchaseInvoicesData;
}
if (typeof storesData !== 'undefined') {
    window.storesDataFromDB = storesData;
}
if (typeof stockByStoreData !== 'undefined') {
    window.stockByStoreDataFromDB = stockByStoreData;
}
"@

# Save as UTF-8 (no BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$filePath = Join-Path (Get-Location) "database_data.js"
[System.IO.File]::WriteAllText($filePath, $jsContent, $utf8NoBom)

Write-Host "Done." -ForegroundColor Green
Write-Host ("Products: {0}" -f $products.Count) -ForegroundColor Cyan
Write-Host ("Clients: {0}" -f $clients.Count) -ForegroundColor Cyan
Write-Host ("Suppliers: {0}" -f $suppliers.Count) -ForegroundColor Cyan
Write-Host ("Selling invoices: {0}" -f $sellingInvoices.Count) -ForegroundColor Cyan
Write-Host ("Purchase invoices: {0}" -f $purchaseInvoices.Count) -ForegroundColor Cyan
Write-Host ("Stores: {0}" -f $stores.Count) -ForegroundColor Cyan
Write-Host ("Stock-by-store rows: {0}" -f $stockByStore.Count) -ForegroundColor Cyan
Write-Host "Generated: database_data.js" -ForegroundColor Yellow
