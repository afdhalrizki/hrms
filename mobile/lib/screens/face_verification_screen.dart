import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceVerificationScreen extends StatefulWidget {
  final bool isClockIn;

  const FaceVerificationScreen({super.key, required this.isClockIn});

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

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _initializeFaceDetector();
  }

  Future<void> _initializeCamera() async {
    _cameras = await availableCameras();
    if (_cameras == null || _cameras!.isEmpty) return;

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
    if (_isBusy || _faceDetector == null) return;
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
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        Navigator.pop(context, {
          'verified': true,
          'method': 'LIVENESS',
        });
      }
    });
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _faceDetector?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.isClockIn ? "Clock In Verification" : "Clock Out Verification", 
          style: GoogleFonts.plusJakartaSans(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: const BackButton(color: Colors.white),
      ),
      body: Stack(
        alignment: Alignment.center,
        children: [
          Transform.scale(
            scale: 1.0,
            child: AspectRatio(
              aspectRatio: _cameraController!.value.aspectRatio,
              child: CameraPreview(_cameraController!),
            ),
          ),
          // Face Oval Overlay
          _buildFaceOverlay(),
          // Scanning Line Animation
          if (_faceDetected && !_blinkDetected)
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
              onEnd: () => setState(() {}),
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
              child: Text(
                _statusMessage,
                style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          if (_blinkDetected)
            const Center(
              child: Icon(Icons.check_circle, color: Colors.green, size: 100),
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
