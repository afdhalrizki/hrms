import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:mobile/utils/style_utils.dart';
import '../widgets/loading_indicator.dart';

class FaceVerificationScreen extends StatefulWidget {
  final bool isClockIn;
  final dynamic mockController;

  const FaceVerificationScreen({super.key, required this.isClockIn, this.mockController});

  @override
  State<FaceVerificationScreen> createState() => _FaceVerificationScreenState();
}

class _FaceVerificationScreenState extends State<FaceVerificationScreen> {
  CameraController? _cameraController;
  FaceDetector? _faceDetector;
  bool _isBusy = false;
  String _statusMessage = "Align your face within the frame";
  bool _faceDetected = false;
  bool _blinkDetected = false;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _initializeFaceDetector();
  }

  Future<void> _initializeCamera() async {
    if (widget.mockController != null) {
      _cameraController = widget.mockController;
      _isCameraInitialized = true;
      if (mounted) setState(() {});
      return;
    }

    if (const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST')) {
      return;
    }
    
    try {
      _cameras = await availableCameras();
      if (_cameras == null || _cameras!.isEmpty) return;
    } catch (e) {
      debugPrint("Camera initialization error: $e");
      return;
    }

    // Use front camera
    final frontCamera = _cameras!.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.front,
      orElse: () => _cameras!.first,
    );

    _cameraController = CameraController(
      frontCamera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    await _cameraController?.initialize();
    if (!mounted) return;

    _cameraController?.startImageStream(_processCameraImage);
    setState(() {});
  }

  void _initializeFaceDetector() {
    _faceDetector = FaceDetector(
      options: FaceDetectorOptions(
        enableContours: true,
        enableClassification: true, // For blinking
        performanceMode: FaceDetectorMode.accurate,
      ),
    );
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isBusy || _faceDetector == null || _blinkDetected || _statusMessage.contains("failed")) return;
    _isBusy = true;

    try {
      final WriteBuffer allBytes = WriteBuffer();
      for (final Plane plane in image.planes) {
        allBytes.putUint8List(plane.bytes);
      }
      final bytes = allBytes.done().buffer.asUint8List();

      final Size imageSize = Size(image.width.toDouble(), image.height.toDouble());
      final camera = _cameras![0];
      final imageRotation = InputImageRotationValue.fromRawValue(camera.sensorOrientation) ?? InputImageRotation.rotation0deg;
      final inputImageFormat = InputImageFormatValue.fromRawValue(image.format.raw) ?? InputImageFormat.nv21;

      final inputImageMetadata = InputImageMetadata(
        size: imageSize,
        rotation: imageRotation,
        format: inputImageFormat,
        bytesPerRow: image.planes[0].bytesPerRow,
      );

      final inputImage = InputImage.fromBytes(
        bytes: bytes,
        metadata: inputImageMetadata,
      );

      final faces = await _faceDetector!.processImage(inputImage);

      if (faces.isEmpty) {
        setState(() {
          _faceDetected = false;
          _statusMessage = "No face detected";
        });
      } else if (faces.length > 1) {
        setState(() {
          _faceDetected = false;
          _statusMessage = "Multiple faces detected. Please be alone.";
        });
      } else {
        final face = faces.first;
        
        // Check face position (conceptual - center of frame)
        // For simplicity, we check if eyes are open then blink
        setState(() {
          _faceDetected = true;
          _statusMessage = "Face detected! Now blink to verify.";
          
          if (face.leftEyeOpenProbability != null && face.rightEyeOpenProbability != null) {
            if (face.leftEyeOpenProbability! < 0.2 && face.rightEyeOpenProbability! < 0.2) {
              _blinkDetected = true;
              _statusMessage = "Liveness verified!";
              _completeVerification();
            }
          }
        });
      }
    } catch (e) {
      debugPrint("Error processing image: $e");
    } finally {
      _isBusy = false;
    }
  }

  void _completeVerification() {
    _cameraController?.stopImageStream();
    // In a real app, we would capture the high-res image and send it to backend
    if (kDebugMode || const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST')) {
      if (mounted) {
        Navigator.pop(context, {
          'verified': true,
          'method': 'LIVENESS',
        });
      }
    } else {
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) {
          Navigator.pop(context, {
            'verified': true,
            'method': 'LIVENESS',
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    if (!const bool.fromEnvironment('INTEGRATED_TEST') && !Platform.environment.containsKey('FLUTTER_TEST')) {
      _faceDetector?.close();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          title: const Text("Face Verification", style: TextStyle(color: Colors.white)),
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: const BackButton(color: Colors.white),
          actions: [
            if (kDebugMode || const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST'))
              Row(
                children: [
                  TextButton(
                    key: const Key('simulate_face_failure'),
                    onPressed: () => setState(() => _statusMessage = "Verification failed"),
                    child: const Text('FAIL', style: TextStyle(color: Colors.redAccent)),
                  ),
                  TextButton(
                    key: const Key('simulate_face_success'),
                    onPressed: _completeVerification,
                    child: const Text('SIMULATE', style: TextStyle(color: Colors.yellow)),
                  ),
                ],
              ),
          ],
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const AppLoadingIndicator(color: Colors.white),
              if (Platform.environment.containsKey('FLUTTER_TEST'))
                Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Text(
                    _statusMessage,
                    key: const Key('face_status_msg'),
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.isClockIn ? "Clock In Verification" : "Clock Out Verification", 
          style: AppTheme.plusJakartaSans(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          if (widget.mockController != null)
            Container(key: const Key('mock_camera_preview'), color: Colors.blue[900], child: const Center(child: Icon(Icons.camera, color: Colors.white, size: 100)))
          else
            CameraPreview(_cameraController!),
          // Face Oval Overlay
          _buildFaceOverlay(),
          // Scanning Line Animation
          if (_faceDetected && !_blinkDetected && !Platform.environment.containsKey('FLUTTER_TEST'))
            TweenAnimationBuilder(
              tween: Tween<double>(begin: 0, end: 1),
              duration: const Duration(seconds: 2),
              builder: (context, double value, child) {
                final height = MediaQuery.of(context).size.height;
                return Positioned(
                  top: height * 0.25 + (height * 0.5 * value),
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.7,
                    height: 2,
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: Colors.blueAccent.withOpacity(0.5),
                          blurRadius: 10,
                          spreadRadius: 2,
                        ),
                      ],
                      gradient: LinearGradient(
                        colors: [
                          Colors.blueAccent.withOpacity(0),
                          Colors.blueAccent,
                          Colors.blueAccent.withOpacity(0),
                        ],
                      ),
                    ),
                  ),
                );
              },
              onEnd: () {
                // Restart only if still detecting face and not verified
                // Guard against infinite loop in tests (pumpAndSettle timeout)
                if (mounted && _faceDetected && !_blinkDetected && !Platform.environment.containsKey('FLUTTER_TEST')) {
                  setState(() {});
                }
              },
            ),
          // Status Message
          Positioned(
            bottom: 100,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Builder(builder: (context) {
                print('DEBUG E2E: Status update: $_statusMessage');
                return Text(
                  _statusMessage,
                  key: const Key('face_status_msg'),
                  style: AppTheme.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
                );
              }),
            ),
          ),
          if (_blinkDetected)
            const Center(
              child: Icon(Icons.check_circle, color: Colors.green, size: 100),
            ),
          // Test-only skip button
          if (kDebugMode || const bool.fromEnvironment('INTEGRATED_TEST') || Platform.environment.containsKey('FLUTTER_TEST'))
            Positioned(
              top: 50,
              right: 20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  TextButton(
                    key: const Key('simulate_face_failure'),
                    onPressed: () => setState(() {
                      _faceDetected = true;
                      _statusMessage = "Verification failed";
                    }),
                    child: const Text('SIMULATE FAILURE', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  ),
                  TextButton(
                    key: const Key('simulate_face_success'),
                    onPressed: _completeVerification,
                    child: const Text('SIMULATE SUCCESS', style: TextStyle(color: Colors.yellow, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFaceOverlay() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: ShapeDecoration(
        shape: FaceOverlayShape(
          borderColor: _faceDetected ? Colors.green : Colors.redAccent,
          borderWidth: 4,
        ),
      ),
    );
  }
}

class FaceOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;

  const FaceOverlayShape({required this.borderColor, required this.borderWidth});

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => Path();

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    return Path()..addRect(rect);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    final ovalWidth = rect.width * 0.7;
    final ovalHeight = rect.height * 0.5;
    final ovalRect = Rect.fromCenter(
      center: rect.center,
      width: ovalWidth,
      height: ovalHeight,
    );

    final path = Path()
      ..addRect(rect)
      ..addOval(ovalRect)
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    canvas.drawOval(ovalRect, borderPaint);
  }

  @override
  ShapeBorder scale(double t) => this;
}
