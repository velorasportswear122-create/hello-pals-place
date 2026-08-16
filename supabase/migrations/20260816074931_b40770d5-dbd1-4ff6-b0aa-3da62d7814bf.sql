-- 1. Add fields to contact_requests
ALTER TABLE public.contact_requests 
ADD COLUMN IF NOT EXISTS preferred_appointment text;

-- 2. Add receipt_url to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS receipt_url text;

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.contact_requests(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id),
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Grants for messages
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 5. Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Policies for messages
CREATE POLICY "Users can view messages for their own requests"
ON public.messages
FOR SELECT
TO authenticated
USING (
    sender_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.contact_requests
        WHERE id = request_id AND requester_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert messages for their own requests"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid() AND (
        EXISTS (
            SELECT 1 FROM public.contact_requests
            WHERE id = request_id AND requester_id = auth.uid()
        ) OR
        public.has_role(auth.uid(), 'admin')
    )
);

-- 7. Notification trigger for messages
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id uuid;
    v_property_title text;
    v_property_id uuid;
BEGIN
    -- Get property info and requester ID
    SELECT cr.requester_id, p.title, p.id INTO v_recipient_id, v_property_title, v_property_id
    FROM public.contact_requests cr
    JOIN public.properties p ON cr.property_id = p.id
    WHERE cr.id = NEW.request_id;

    -- If sender is requester, notify admin (or just all admins for now)
    -- If sender is admin, notify requester
    IF NEW.sender_id = v_recipient_id THEN
        -- Notify admins (we just send one notification for now, or handle in app)
        -- For simplicity, let's notify the property owner too if relevant, 
        -- but the request says "between user and admin".
        INSERT INTO public.notifications (user_id, title, content, type)
        SELECT u.id, 'رسالة جديدة من مستخدم', 'رسالة بخصوص: ' || v_property_title, 'message'
        FROM public.user_roles ur
        JOIN auth.users u ON ur.user_id = u.id
        WHERE ur.role = 'admin';
    ELSE
        INSERT INTO public.notifications (user_id, title, content, type)
        VALUES (v_recipient_id, 'رسالة جديدة من الإدارة', 'رد الإدارة بخصوص: ' || v_property_title, 'message');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
