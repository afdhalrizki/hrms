import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:mobile/utils/style_utils.dart';
import '../api/api_service.dart';
import '../widgets/loading_indicator.dart';

class ProfileDocumentsScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const ProfileDocumentsScreen({super.key, required this.userData});

  @override
  State<ProfileDocumentsScreen> createState() => _ProfileDocumentsScreenState();
}

class _ProfileDocumentsScreenState extends State<ProfileDocumentsScreen> {
  CameraController? _cameraController;
  bool _isCameraReady = false;
  bool _isUploading = false;
  String? _currentUploadingField; // 'ktp_image' or 'npwp_image'

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    final bool isTest = const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST');
    if (isTest) {
      return;
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) return;

      _cameraController = CameraController(
        cameras.first,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      if (mounted) setState(() => _isCameraReady = true);
    } catch (e) {
      debugPrint("Camera initialization error: $e");
    }
  }

  @override
  void dispose() {
    if (_cameraController != null) {
      _cameraController!.dispose();
    }
    super.dispose();
  }

  Future<void> _captureAndUpload(String fieldName) async {
    final bool isTest = const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST');
    if (!isTest && (_cameraController == null || !_cameraController!.value.isInitialized)) return;

    setState(() {
      _isUploading = true;
      _currentUploadingField = fieldName;
    });

    try {
      final List<int> bytes;
      if (isTest) {
        // Valid base64 1x1 PNG
        bytes = base64Decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==");
      } else {
        final XFile image = await _cameraController!.takePicture();
        bytes = await image.readAsBytes();
      }
      
      final api = ApiService();
      final employeeId = widget.userData['employee_id'];
      
      await api.uploadDocument(
        employeeId, 
        fieldName, 
        bytes, 
        "${fieldName}_${DateTime.now().millisecondsSinceEpoch}.png"
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${fieldName.replaceAll('_', ' ').toUpperCase()} uploaded successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _currentUploadingField = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text('Documents', style: AppTheme.plusJakartaSans(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        actions: [
          if (const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST'))
            TextButton(
              key: const Key('simulate_doc_capture'),
              onPressed: () {
                 if (_currentUploadingField != null) {
                    _captureAndUpload(_currentUploadingField!);
                 } else {
                    _captureAndUpload('ktp_image');
                 }
              },
              child: const Text('SIMULATE', style: TextStyle(color: Colors.yellow)),
            ),
        ],
      ),
      body: Column(
        children: [
          if (_isCameraReady)
            Container(
              height: 300,
              width: double.infinity,
              margin: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white10),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: (const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST'))
                    ? Container(key: const Key('mock_camera_preview'), color: Colors.grey[800], child: const Center(child: Icon(Icons.camera_alt, color: Colors.white, size: 50)))
                    : CameraPreview(_cameraController!),
              ),
              clipBehavior: Clip.antiAlias,
            )
          else
            Container(
              height: 300,
              child: const Center(child: AppLoadingIndicator()),
            ),
          
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              children: [
                _buildDocumentItem(
                  'KTP Image',
                  'ktp_image',
                  widget.userData['ktp_image'] != null,
                ),
                const SizedBox(height: 16),
                _buildDocumentItem(
                  'NPWP Image',
                  'npwp_image',
                  widget.userData['npwp_image'] != null,
                ),
                const SizedBox(height: 32),
                Text(
                  'Note: Position the document within the camera preview above before clicking capture.',
                  style: AppTheme.plusJakartaSans(color: Colors.white60, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentItem(String label, String fieldName, bool isUploaded) {
    final isThisUploading = _isUploading && _currentUploadingField == fieldName;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isUploaded ? Colors.green.withOpacity(0.1) : Colors.blueAccent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isUploaded ? Icons.verified : Icons.description,
              color: isUploaded ? Colors.green : Colors.blueAccent,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text(
                  isUploaded ? 'UPLOADED' : 'NOT UPLOADED',
                  style: TextStyle(
                    color: isUploaded ? Colors.green : Colors.white60,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _isUploading ? null : () => _captureAndUpload(fieldName),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white10,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: isThisUploading 
              ? const SizedBox(height: 16, width: 16, child: AppLoadingIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Capture'),
          ),
        ],
      ),
    );
  }
}
