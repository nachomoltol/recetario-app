import UIKit
import Capacitor
#if canImport(AppTrackingTransparency)
import AppTrackingTransparency
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var hasScheduledATTRequest = false

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        requestTrackingPermissionIfNeeded()
    }

    private func requestTrackingPermissionIfNeeded() {
        #if canImport(AppTrackingTransparency)
        guard !hasScheduledATTRequest else { return }
        if #available(iOS 14.5, *) {
            guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else {
                hasScheduledATTRequest = true
                return
            }
            hasScheduledATTRequest = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                guard let self = self else { return }
                guard UIApplication.shared.applicationState == .active else {
                    self.hasScheduledATTRequest = false
                    return
                }
                ATTrackingManager.requestTrackingAuthorization { _ in
                    // El estado elegido por el usuario se persiste a nivel de sistema
                    // y Google Mobile Ads / UMP lo respeta automáticamente.
                }
            }
        }
        #endif
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
