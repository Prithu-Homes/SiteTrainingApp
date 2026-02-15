using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Azure.Storage;
using Azure.Storage.Sas;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;

namespace Company.Function;

public class GenerateVideoSas
{
    private const string DefaultContainerName = "trainingvideos";
    private static readonly JwtSecurityTokenHandler TokenHandler = new();
    private readonly ILogger<GenerateVideoSas> _logger;

    public GenerateVideoSas(ILogger<GenerateVideoSas> logger)
    {
        _logger = logger;
    }

    [Function("GenerateVideoSas")]
    public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
    {
        try
        {
            var aadTenantId = Environment.GetEnvironmentVariable("AzureAdTenantId");
            var aadClientId = Environment.GetEnvironmentVariable("AzureAdClientId");
            if (string.IsNullOrWhiteSpace(aadTenantId) || string.IsNullOrWhiteSpace(aadClientId))
            {
                _logger.LogError("Azure AD configuration is missing.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }

            if (!await IsAuthorizedAsync(req, aadTenantId, aadClientId))
            {
                return new UnauthorizedObjectResult(new { error = "Unauthorized. Valid Azure AD token required." });
            }

            var file = req.Query["file"].ToString();
            if (string.IsNullOrWhiteSpace(file))
            {
                return new BadRequestObjectResult(new { error = "Missing required query parameter: file" });
            }

            var storageAccountName = Environment.GetEnvironmentVariable("StorageAccountName");
            var storageAccountKey = Environment.GetEnvironmentVariable("StorageAccountKey");
            var containerName = Environment.GetEnvironmentVariable("TrainingVideosContainer");
            if (string.IsNullOrWhiteSpace(containerName))
            {
                containerName = DefaultContainerName;
            }

            if (string.IsNullOrWhiteSpace(storageAccountName) || string.IsNullOrWhiteSpace(storageAccountKey))
            {
                _logger.LogError("Storage account configuration is missing.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }

            try
            {
                _ = Convert.FromBase64String(storageAccountKey);
            }
            catch (FormatException)
            {
                _logger.LogWarning("StorageAccountKey is not a valid base64 value.");
                return new UnauthorizedObjectResult(new { error = "Invalid storage account credentials." });
            }

            var credential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);

            var sasBuilder = new BlobSasBuilder
            {
                BlobContainerName = containerName,
                BlobName = file,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-1),
                ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(10)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);

            var blobUrl = $"https://{storageAccountName}.blob.core.windows.net/{containerName}/{Uri.EscapeDataString(file)}";
            var sasToken = sasBuilder.ToSasQueryParameters(credential).ToString();
            var sasUrl = $"{blobUrl}?{sasToken}";

            return new OkObjectResult(new { sasUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate SAS URL.");
            return new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<bool> IsAuthorizedAsync(HttpRequest req, string tenantId, string clientId)
    {
        var authHeader = req.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
        var metadataAddress = $"{authority}/.well-known/openid-configuration";
        var configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataAddress,
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });

        var openIdConfig = await configManager.GetConfigurationAsync(CancellationToken.None);
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authority,
            ValidateAudience = true,
            ValidAudience = clientId,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = openIdConfig.SigningKeys,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        try
        {
            TokenHandler.ValidateToken(token, validationParameters, out _);
            return true;
        }
        catch (SecurityTokenException)
        {
            return false;
        }
    }
}
