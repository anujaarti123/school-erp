/// API base URL. Uses live Render backend - no IP/config needed.
const String kLiveBackendUrl = 'https://school-erp-06ur.onrender.com';

class ApiConfig {
  static Future<String> getBaseUrl() async {
    return kLiveBackendUrl;
  }
}
