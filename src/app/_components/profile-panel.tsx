"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  buildXAvatarUrl,
  normalizeXUsername,
} from "@/lib/identity/username";

import styles from "./profile-panel.module.css";

type PublicProfile = {
  username: string;
  profileImageUrl: string;
};

type ProfilePanelProps = {
  initialProfile: PublicProfile | null;
  quizEntryRequested?: boolean;
  quizAttemptId?: string | null;
};

type FlowStep = "entry" | "loading" | "confirm" | "image-error" | "submitting";

type PreviewProfile = PublicProfile;

type DirectAvatarProps = {
  src: string;
  alt: string;
  className: string;
  onLoad?: () => void;
  onError?: () => void;
};

function DirectAvatar({
  src,
  alt,
  className,
  onLoad,
  onError,
}: DirectAvatarProps) {
  return (
    // Browser-direct by design: Next Image would otherwise proxy the Unavatar request.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width="320"
      height="320"
      className={className}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

function isPublicProfile(value: unknown): value is PublicProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.username === "string" &&
    typeof candidate.profileImageUrl === "string"
  );
}

export function ProfilePanel({
  initialProfile,
  quizEntryRequested = false,
  quizAttemptId = null,
}: ProfilePanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [profileAvatarFailed, setProfileAvatarFailed] = useState(false);
  const [step, setStep] = useState<FlowStep>("entry");
  const [usernameInput, setUsernameInput] = useState("");
  const [preview, setPreview] = useState<PreviewProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(
    quizEntryRequested && !initialProfile,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  useEffect(() => {
    if (dialogOpen && step === "entry") {
      const frame = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [dialogOpen, step]);

  useEffect(() => {
    if (!quizEntryRequested || profile || dialogRef.current?.open) {
      return;
    }

    dialogRef.current?.showModal();
  }, [profile, quizEntryRequested]);

  const resetEntry = (suggestedUsername = "") => {
    setUsernameInput(suggestedUsername);
    setPreview(null);
    setErrorMessage(null);
    setStep("entry");
  };

  const openDialog = () => {
    resetEntry(profile?.username ?? "");
    setDialogOpen(true);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setErrorMessage(null);
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  const findProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const username = normalizeXUsername(usernameInput);
      setPreview({
        username,
        profileImageUrl: buildXAvatarUrl(username),
      });
      setErrorMessage(null);
      setStep("loading");
    } catch (error) {
      const message =
        error && typeof error === "object" && "issues" in error
          ? ((error as { issues?: Array<{ message?: string }> }).issues?.[0]
              ?.message ?? "Enter a valid X username.")
          : "Enter a valid X username.";
      setErrorMessage(message);
    }
  };

  const confirmAccount = async () => {
    if (!preview || step !== "confirm") {
      return;
    }

    setErrorMessage(null);
    setStep("submitting");

    try {
      const response = await fetch("/api/profile/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: preview.username }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const serverError =
          body && typeof body === "object" && "error" in body
            ? (body as { error?: unknown }).error
            : null;
        throw new Error(
          typeof serverError === "string"
            ? serverError
            : "We couldn't prepare your profile. Try again.",
        );
      }

      if (!isPublicProfile(body)) {
        throw new Error("We couldn't prepare your profile. Try again.");
      }

      setProfile(body);
      setProfileAvatarFailed(false);

      if (quizEntryRequested) {
        const quizDestination = quizAttemptId
          ? `/quiz?attempt=${encodeURIComponent(quizAttemptId)}`
          : "/quiz";
        router.push(quizDestination);
      } else {
        closeDialog();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't prepare your profile. Try again.",
      );
      setStep("confirm");
    }
  };

  return (
    <div className={styles.identityPanel}>
      {profile ? (
        <div className={styles.readyState}>
          <div className={styles.readyProfile}>
            {profileAvatarFailed ? (
              <span className={styles.avatarFallback} aria-hidden="true">
                @
              </span>
            ) : (
              <DirectAvatar
                src={profile.profileImageUrl}
                alt={`Public X avatar for @${profile.username}`}
                className={styles.readyAvatar}
                onError={() => setProfileAvatarFailed(true)}
              />
            )}
            <div>
              <span className={styles.status}>Profile ready</span>
              <strong>@{profile.username}</strong>
            </div>
          </div>
          <button className={styles.changeButton} type="button" onClick={openDialog}>
            Change
          </button>
          <Link className={styles.startQuizLink} href="/quiz">
            Start quiz <span aria-hidden="true">→</span>
          </Link>
          <a
            className={styles.attribution}
            href="https://unavatar.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Avatars provided by Unavatar
          </a>
        </div>
      ) : (
        <div className={styles.entryCta}>
          <button className={styles.primaryButton} type="button" onClick={openDialog}>
            Enter X username
            <span aria-hidden="true">→</span>
          </button>
          <p>
            Confirm your public avatar to prepare an Arena profile. This does not
            verify X account ownership.
          </p>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={handleDialogClose}
        onClick={handleBackdropClick}
      >
        <div className={styles.dialogSurface}>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close profile setup"
            onClick={closeDialog}
          >
            ×
          </button>

          {step === "entry" ? (
            <form className={styles.form} onSubmit={findProfile}>
              <span className={styles.stepMarker}>Profile setup / 01</span>
              <h2 className={styles.headline} id={titleId}>
                <span>Enter your</span>
                <span>X username</span>
              </h2>
              <p id={descriptionId}>
                We&apos;ll find your public profile so you can confirm it.
              </p>
              <label className={styles.inputLabel} htmlFor="x-username">
                X username
              </label>
              <div className={styles.inputShell}>
                <span aria-hidden="true">@</span>
                <input
                  ref={inputRef}
                  id="x-username"
                  name="username"
                  type="text"
                  value={usernameInput}
                  onChange={(event) => setUsernameInput(event.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={64}
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={errorMessage ? errorId : descriptionId}
                />
              </div>
              {errorMessage ? (
                <p className={styles.error} id={errorId} role="alert">
                  {errorMessage}
                </p>
              ) : null}
              <button className={styles.primaryButton} type="submit">
                Find my profile
                <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <div className={styles.confirmation}>
              <span className={styles.stepMarker}>Profile setup / 02</span>
              <h2 className={styles.headline} id={titleId}>
                <span>Is this your</span>
                <span>account?</span>
              </h2>
              <p id={descriptionId}>
                Confirm this is the profile you want to use in Rialo Arena.
              </p>

              {preview && step !== "image-error" ? (
                <div className={styles.avatarFrame} aria-live="polite">
                  <DirectAvatar
                    src={preview.profileImageUrl}
                    alt={`Public X avatar for @${preview.username}`}
                    className={styles.previewAvatar}
                    onLoad={() => {
                      if (step === "loading") {
                        setStep("confirm");
                      }
                    }}
                    onError={() => setStep("image-error")}
                  />
                  {step === "loading" ? (
                    <span className={styles.loadingLabel}>Loading avatar…</span>
                  ) : null}
                </div>
              ) : null}

              {step === "image-error" ? (
                <p className={styles.avatarError} role="alert">
                  We couldn&apos;t find that profile. Check the username and try again.
                </p>
              ) : null}

              {preview ? <strong className={styles.previewUsername}>@{preview.username}</strong> : null}

              {errorMessage ? (
                <p className={styles.error} id={errorId} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className={styles.confirmActions}>
                {step === "confirm" || step === "submitting" ? (
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={step === "submitting"}
                    onClick={confirmAccount}
                  >
                    {step === "submitting" ? "Preparing profile…" : "Yes, continue"}
                    <span aria-hidden="true">→</span>
                  </button>
                ) : null}
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={step === "submitting"}
                  onClick={() => resetEntry(preview?.username ?? "")}
                >
                  {step === "image-error" ? "Try again" : "No, try again"}
                </button>
              </div>

              <a
                className={styles.attribution}
                href="https://unavatar.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Avatars provided by Unavatar
              </a>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
