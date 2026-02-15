using System;
using Azure.Storage;
using Azure.Storage.Sas;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Company.Function;

public class GenerateVideoSas
{
    private const string ContainerName = "trainingvideos";
    private readonly ILogger<GenerateVideoSas> _logger;

    public GenerateVideoSas(ILogger<GenerateVideoSas> logger)
    {
        _logger = logger;
    }

    [Function("GenerateVideoSas")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Function, "get")] HttpRequest req)
    {
        try
        {
            var file = req.Query["file"].ToString();
            if (string.IsNullOrWhiteSpace(file))
            {
                return new BadRequestObjectResult(new { error = "Missing required query parameter: file" });
            }

            var storageAccountName = Environment.GetEnvironmentVariable("StorageAccountName");
            var storageAccountKey = Environment.GetEnvironmentVariable("StorageAccountKey");

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
                BlobContainerName = ContainerName,
                BlobName = file,
                Resource = "b",
                StartsOn = DateTimeOffset.UtcNow.AddMinutes(-1),
                ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(10)
            };
            sasBuilder.SetPermissions(BlobSasPermissions.Read);

            var blobUrl = $"https://{storageAccountName}.blob.core.windows.net/{ContainerName}/{Uri.EscapeDataString(file)}";
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
}
