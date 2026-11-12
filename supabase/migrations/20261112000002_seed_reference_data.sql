-- Reference data (not demo listings): categories and a skills catalog.
insert into public.categories (slug, name, name_fr, name_mg, sort_order) values
 ('graphic-design', 'Graphic Design', 'Design graphique', 'Famolavolana sary', 1),
 ('ui-ux-design', 'UI/UX Design', 'Design UI/UX', 'Famolavolana UI/UX', 2),
 ('web-development', 'Web Development', 'Développement web', 'Fampandrosoana web', 3),
 ('mobile-app-development', 'Mobile App Development', 'Développement d''applications mobiles', 'Fampandrosoana application finday', 4),
 ('programming', 'Programming', 'Programmation', 'Fandaharana (programmation)', 5),
 ('social-media-management', 'Social Media Management', 'Gestion des réseaux sociaux', 'Fitantanana tambajotra sosialy', 6),
 ('community-management', 'Community Management', 'Community management', 'Fitantanana vondrom-piarahamonina', 7),
 ('digital-marketing', 'Digital Marketing', 'Marketing digital', 'Marketing nomerika', 8),
 ('seo', 'SEO', 'SEO', 'SEO', 9),
 ('video-editing', 'Video Editing', 'Montage vidéo', 'Fanapahana horonan-tsary', 10),
 ('content-writing', 'Content Writing', 'Rédaction de contenu', 'Fanoratana votoaty', 11),
 ('translation', 'Translation', 'Traduction', 'Fandikan-teny', 12),
 ('data-entry', 'Data Entry', 'Saisie de données', 'Fampidirana angona', 13),
 ('virtual-assistant', 'Virtual Assistant', 'Assistant virtuel', 'Mpanampy virtoaly', 14),
 ('customer-support', 'Customer Support', 'Support client', 'Fanohanana mpanjifa', 15),
 ('other-digital-services', 'Other Digital Services', 'Autres services numériques', 'Serivisy nomerika hafa', 16)
on conflict (slug) do nothing;

insert into public.skills (name) values
 ('photoshop'), ('illustrator'), ('figma'), ('canva'), ('html'), ('css'), ('javascript'), ('typescript'),
 ('react'), ('next.js'), ('node.js'), ('python'), ('php'), ('laravel'), ('flutter'), ('react native'),
 ('sql'), ('wordpress'), ('seo'), ('copywriting'), ('video editing'), ('premiere pro'), ('after effects'),
 ('social media'), ('translation'), ('data entry'), ('excel'), ('customer support'), ('community management'),
 ('project management')
on conflict (name) do nothing;
